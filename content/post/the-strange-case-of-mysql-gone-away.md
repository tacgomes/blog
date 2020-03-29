---
title: The strange case of the MySQL server has gone away
date: 2020-03-29
tags:
- MySQL
- Django
---

A while ago, I had to track down the root cause for a strange issue observed in
a Django-based service that I was involved with. This issue consisted in
database operations systematically failing when the service was inactive
for a long period. Whenever this happened, the following message appeared in
the log:

    OperationalError: (2006, 'MySQL server has gone away')

Afterwards, the service would no longer function properly until it was manually
restarted.

After a bit of Internet research, I gathered that this issue was most likely
caused by the reuse of a persistent database connection which had timed out at
the server side. This happens when the connection is inactive for a period
longer than the value set for [wait_timeout]. However, as we were not setting a
value for [CONN_MAX_AGE] in our Django configuration, we should not even being
reusing a database connection in the first place - the default value for the
`CONN_MAX_AGE` setting is `0`, in which case the database connections should
not persist.

After digging into Django's codebase, I realized that the function to close the
old database connections was only called at the start and at the end of each
**HTTP** request handling:

```python
signals.request_started.connect(close_old_connections)
signals.request_finished.connect(close_old_connections)
```

This was the gist of the problem. Our service was a simple Django management
command which consumed requests from a Kafka queue. As it never received any
HTTP traffic, those signals would never be triggered and the old database
connection would never be closed. This led to Django to continuously reuse the
same connection in the subsequent database operations, even when it had
possibly timed out due inactivity.

The fix was to manually call the function to close old database connections
immediately after receiving a new request from Kafka and before doing any
database operation. This will ensure that the next time a database operation is
performed, a new database connection will be used if its age is older than
`CONN_MAX_AGE`.

```python
import django.db

msg = kafka_consumer.poll()

db.close_old_connections()

MyModel.objects.get(…)
```

I hope you find this useful if facing the same situation.

[CONN_MAX_AGE]: https://docs.djangoproject.com/en/2.2/ref/settings/#conn-max-age
[wait_timeout]: https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_wait_timeout
