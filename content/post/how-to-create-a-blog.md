---
title: Creating a blog website with GitLab, Hugo and staticman
date: 2020-03-01
tags:
- hugo
- GitLab
- staticman
- dns
---

As my very first blog post, it feels appropriate that I start my new
blogging hobby by discussing the setup that I have used to build this
website.

Most blog websites sites are made using [WordPress]. I never had a
chance to used it, but wouldn't it be better if instead of your web
content being stored in some relational database which you don't have
directly access and which you need to remember to create regular
backups, it was instead stored on git? Where you could easily see all
the revisions you made and have the content safeguarded on the remote
repository by doing a simple `git push`?

[GitLab Pages] takes one step further in which allows to publish a
static website directly from your remote repository, and for free! All
you have to do is to configure a special continuous integration
[job][gitlab-pages-job] pointing to the directory containing the HTML
source, and the website will be made available at a specific web
address.

You don't usually write the HTML directly, but rather produce the
content in a markup language such as Markdown or RST, and then use a
static site generator to create the HTML data from the markup.

Static websites don't support any server-side processing though, which
is normally not needed for a blog type of website, but also prevents
allowing readers to comment on your posts. Later on, I explain how it is
possible to work around this issue in particular.


## Creating a Project from a Hugo Template

There are plenty of static site generators and [Jekyll] is the most
popular option. I didn't want to install the Ruby stack on my machine
though, so I opted for [Hugo] instead. Hugo is written in a compiled
language (Go), which probably explains why it builds websites so fast.
It includes a small web server that monitors the files for saved changes
and refreshes the pages automatically when it detects such changes. This
way, so don't need to restart the server every time you want to view the
rendered content. The rest of this blog post assumes you had choosen
Hugo as well.

To create your blog website, the first thing you need to do is to create
the project where you will store your web content. Log in into your
GitLab account, click on the plus button on the top bar, then _New
Project_. Click on _Create from template_ and then chose _Pages/Hugo_
for the template. Give a name to your project and then click on _Create
project_. You can chose a private visibility level without affecting how
GitLab pages will work.

After the project is created, go to _CI/CD_, _Pipelines_ and click on
_Run Pipeline_. The pipeline may take some time to complete in the first
deployment, but  after it finishes your website will be automatically
published at `https://<username>.gitlab.io/<projectname>`, where
`<username>` is your GitLab username and `<projectname>` is the name you
gave to your project.


## Configuration

Now, you should clone your repository to tweak your website's
configuration and add content.

Previewing the changes locally couldn't be easier. All you have to do is
to go to the directory where you cloned the repository, and start the
web server by running `hugo server`. An URL will be shown in the
terminal. Open that URL in your browser to preview your website.

The default configuration file for Hugo is called `config.toml`. The
configuration is specified in the [TOML] language, which I am not much
of a fan. Luckily, Hugo also supports configuration specified in YAML.
Just rename `config.toml` to `config.yaml` and use an [online converter
tool] to convert between the two formats. This is an example of the
`config.yaml` that I use for my blog:


```
baseurl: 'https://tacgomes.gitlab.io/blog/'
title: '#FIXME Blog'
metaDataFormat: yaml
DefaultContentLanguage: en
theme: beautifulhugo

Permalinks:
  post: '/:year/:month/:day/:filename/'

Params:
  dateFormat: 'January 2, 2006'
  favicon: /blog/favicon.png
  rss: true

Author:
  name: Tiago Gomes
  gitlab: tacgomes
  linkedin: tiagoacgomes

menu:
  main:
    - name: About
      url: page/about
```

At at the bare minimum, you should update `baseurl` with the URL where
the website will be published -
`https://<username>.gitlab.io/<projectname>`
- and `title` with a name for your website.

The beautifulhugo theme that comes embedded with the GitLab Pages
template for Hugo was outdated at the time of this writing, and a few
things were not working properly. So, I recommend that you get the
latest version of the [theme][beautifulhugo] and you copy it to the
`themes/beautifulhugo` directory inside your clone directory.

Also, to avoid surprises related to differences between the content
rendered locally and the content rendered on the server, change your
`.gitlab-ci.yml` to use the Hugo's Docker image tagged with the same
version of Hugo installed in your computer. You can find out your
version of Hugo by running `hugo version`.


## Staticman Integration

A disadvantage in using a static website is due the non-existence of
server-side processing, in theory posting new comments would not be
possible as there is no [CGI] application running that could handle the
form data and save it.

Enter [staticman]! staticman works around this issue by providing a
small web service that reads the form data and creates a pull request
for adding the new comment in your repository (or merge directly to
master if you disabled moderation).

To use staticman, first you need to add a `staticman.yml` configuration
file to the top-level of your repository. This file will be read by the
staticman web service and is used for example to define where in the
repository the comments should be saved and what the commit message look
alike for adding a new comments. A minimal example of this file is:

```
comments:
  branch: master
  format: yaml
  path: data/comments/{options.slug}
  filename: comment-{@timestamp}
  commitMessage : New comment from {fields.name}
  allowedFields:
    - name
    - comment
    - replyThread
    - replyName
    - replyID
  requiredFields:
    - name
    - comment
  generatedFields:
    date:
      type: date
```

All the possible settings for this configuration file are on the
staticman [documentation][staticmanconfig]. Note that even if the
documentation mentions that `branch` and `format` have default values,
they still must be defined in the `staticman.yml` configuration file.

The beautifulhugo theme already has built-in support for staticman-based
comments. All you have to do is setting the `comments` and `api` fields
inside the `params` section of your `config.yaml`:

```
…
params:
  comments: true
  staticman:
    api: https://staticman3.herokuapp.com/v3/entry/gitlab/<username>/<projectname>/master/comments
…
```

In the `api` field, replace `<username>` and `<projectname>` with your
GitLab username and the project name used for the website respectively.

The last thing you need to do, is to allow the staticman web service to
create pull requests in your repository. Go to your project's GitLab
page, click on _Settings_, _Members_, and then search for the
_staticmanlab_ user and give him _Developer_ permissions.

The beautifulhugo theme displays several input fields in the form to create
a new comment. Unfortunately, is not possible to configure which fields
to display based on the configuration, so if you are not interested in
any of those you must edit
`themes/beautifulhugo/layouts/partials/staticman-comments.html` and
remove the fields you are not interested in.


## Adding a Custom Domain

GitLab Pages allows you to use a custom domain so that your website also
becomes also available using `https://your.domain` or
`https://www.your.domain`, in addition to the web address already
provided by GitLab Pages.

First, you need to purchase the domain that you want to use. There are a
couple domain registrars. I chose [domain.com] for mine as it had good
reviews and prices. Don't bother to pay extra for a SSL/TLS certificate
as [Let's Encrypt] provides one for free. Besides, GitLab integrates now
with Let's Encrypt, such that  you don't have to download the
certificates yourself and do the validation test that you own the
domain.

After you purchased the domain, go to the GitLab page for your project,
click on _Settings_, _Pages_, and then on the _New Domain_ button. Write
the name of the domain that you had purchased and click on _Create New
Domain_. You should now be seeing a page displaying a `CNAME` and `TXT`
DNS records. Ignore the `CNAME` DNS record, as not all registrars
support using a `CNAME` on the root domain and that also prevents you to
use the domain for an email server if you ever want it. You can read more
about this [here][cname].

Now, go to your domain registrar's admin interface. If there is already
an existing record of type `A` and named with the domain that you have
purchased or otherwise named with `@`, edit that record. Otherwise,
create a new DNS record of type `A`. Use `@` for the name field (`@` is
an alias for your domain name) and `35.185.44.232` for the content
field.  This is the IP address of the GitLab Pages server. Choose any
value for the `TTL` field.

Now, create a record of type `TXT`. The name field for this record
should be the part before `TXT` in the text displayed on the
_Verification status_ section of the domain's page on GitLab (e.g.
`_gitlab-pages-verification-code.example.com`). The content field should
be the part after `TXT` (e.g.  `gitlab-pages-verification-code=1c3e…`).

After this is completed, you need to press the retry button in the
domain's page on GitLab, until GitLab can verify that you own the
domain. You might have to wait some hours until the new DNS updates
propagate and the verification finally succeeds.

If you want your website to be available in the
`https://www.your.domain` web address as well, you need to create a
record of type `CNAME`, with the name field set to `www` and the content
field to `your.domain`. Then you need to repeat the process of adding a
domain in GitLab, including adding a new `TXT` record for verification
purposes.

The last step is to update the `baseurl` field in the `config.yaml` file
to point to your address using the custom domain.

The following picture highlights the DNS records that I had to add to
configure my custom domain.

![Profile Picture](/dns-zone-settings.png)

Alternatively, if you don't want to bother in setting a custom domain,
you can make your website available at `https://<username>.gitlab.io` by
renaming the project to be in the following special format:
`<project>.gitlab.io`, that is, ending in `.gitlab.io`.


[WordPress]: https://wordpress.com/
[GitLab Pages]: https://about.gitlab.com/stages-devops-lifecycle/pages/
[staticman]: https://staticman.net/a
[Jekyll]: https://jekyllrb.com/
[Hugo]: https://gohugo.io/
[staticmanconfig]: https://staticman.net/docs/configuration
[gitlab-pages-job]: https://docs.gitlab.com/ee/ci/yaml/#pages
[CGI]: https://en.wikipedia.org/wiki/Common_Gateway_Interface
[domain.com]: https://www.domain.com/
[Let's Encrypt]: https://letsencrypt.org/
[cname]: https://www.freecodecamp.org/news/why-cant-a-domain-s-root-be-a-cname-8cbab38e5f5c/
[TOML]: https://github.com/toml-lang/toml
[online converter tool]: https://toolkit.site/format.htmla
[beautifulhugo]: https://github.com/halogenica/beautifulhugo/archive/master.zip
