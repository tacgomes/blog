---
title: Creating a blog website with GitLab, Hugo and staticman
date: 2020-03-01
tags:
- hugo
- GitLab
- staticman
- dns
---

As my very first blog post, it feels appropriate that I start my new hobby by
discussing the setup that I have used to build this website.

Most blog websites sites are made using [WordPress]. I never had a chance to
used it, but wouldn't it be better if instead of your web content being stored
in some relational database which you don't have directly access to, and which
you need to remember to create regular backups, it was instead stored on git?
Where you could easily look at the revisions you made so far and have the
content always safeguarded on the remote repository at the cost of a mere `git
push`?

[GitLab Pages] takes this principle of git-as-database one step further in
which it facilitates to publish a static website directly from the content in
your remote repository, and for free! All you have to do is to configure a
special continuous integration [job][gitlab-pages-job] pointing to the
directory containing the HTML source, and the website will be magically made
available at a specific web address.

You don't usually commit HTML files directly to your repository, but rather
produce the content in a markup language such as Markdown or RST, and then use
a static site generator to create the website from the source content.

Static websites don't support any server-side processing though, which is
normally not needed for a blog type of website, but also prevents allowing
readers to comment on your posts. Later on, I explain how it is possible to
work around this issue in particular.


## Creating a Project from a Hugo Template

There are plenty of static site generators and [Jekyll] is the most popular
option. I didn't want to install the Ruby stack on my machine though, so I
opted for [Hugo]. Hugo is written in a compiled language (Go), which probably
explains why it builds websites in a jiff. It includes a small web server that
monitors the files for saved changes and refreshes the pages automatically when
it detects such changes. This way, so don't need to restart the server every
time you want to preview the content. The rest of this blog post assumes you
had choosen Hugo as well.

To create your blog website, the first thing you need to do is to create the
project where you will store your web content. Note that I will use the terms
project and repository interchangeably during this post.  Log in into your
GitLab account, click on the plus button on the top bar, then _New Project_.
Click on _Create from template_ and then chose _Pages/Hugo_ for the template.
Give a name to your project and then click on _Create project_. You can chose a
private visibility level without affecting how GitLab Pages will work.

After the project is created, go to _CI/CD_, _Pipelines_ and click on _Run
Pipeline_. The pipeline will take a while to complete in the first execution,
but after it finishes your website will be automatically published at the
following web address: `https://<username>.gitlab.io/<projectname>`, where
`<username>` is your GitLab username and `<projectname>` is the name that you
gave to your project. Go ahead, try the web address!


## Configuration

Assuming everything worked and your website was published correctly, you should
now clone your repository to tweak your website's configuration and add
content.

Previewing the changes locally couldn't be easier. All you have to do is to go
to the directory where you cloned the repository and start the web server by
running `hugo server`. A web address should be shown in the terminal. Open it
in your browser to preview your website.

The default configuration file for Hugo is called `config.toml`. The
configuration is specified in the [TOML] language, which I am not much of a
fan. Luckily, Hugo also supports configuration specified in YAML.  Just rename
`config.toml` to `config.yaml` and use an [online converter tool] to convert
between the two formats. This is an excerpt of the `config.yaml` that I use for
my blog:


```yaml
baseurl: "https://tacgomes.gitlab.io/blog/"
title: "#FIXME Blog"
metaDataFormat: "yaml"
DefaultContentLanguage: "en"
theme: "beautifulhugo"

Permalinks:
  post: "/:year/:month/:day/:filename/"

Params:
  dateFormat: "January 2, 2006"
  favicon: "/blog/favicon.png"
  rss: true

Author:
  name: "Tiago Gomes"
  gitlab: "tacgomes"
  linkedin: "tiagoacgomes"

menu:
  main:
    - name: "About"
      url: "page/about"
```

At at the bare minimum, you should update `baseurl` with the web address where
your website is published on GitLab Pages -
`https://<username>.gitlab.io/<projectname>`
- and `title` with a name for your website.

The beautifulhugo theme that comes embedded with the GitLab Pages template for
Hugo was outdated at the time of this writing, and a few things were not
working properly. So, I recommend that you get the latest version of the
[theme][beautifulhugo] and you copy it to the `themes/beautifulhugo` directory
inside your clone directory.

Also, to avoid surprises related to differences between the content rendered
locally and the content rendered on the server, change your `.gitlab-ci.yml` to
use the Hugo's Docker image tagged with the same version of Hugo installed in
your computer. You can find out your version of Hugo by running `hugo version`.


## Staticman Integration

A disadvantage in using a static website is that due the absence of any
server-side processing, in theory posting new comments would not be possible as
there is no [CGI] application running that could handle the form data and save
it.

Enter [staticman]! staticman works around this issue by providing a small web
service that reads the form data and creates a pull request for adding the new
comment in your repository (or merge directly to master if you disabled
moderation).

To use staticman, first you need to add a `staticman.yml` configuration file to
the top-level directory of your repository. This file will be read by the
staticman web service and is used for example to define where in the repository
the comments should be saved and what the commit message look alike for adding
a new comments. A minimal example of this file is:

```yaml
comments:
  branch: "master"
  format: "yaml"
  path: "data/comments/{options.slug}"
  filename: "comment-{@timestamp}"
  commitMessage: "New comment from {fields.name}"
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

All the possible settings for this configuration file are listed on the
staticman [documentation][staticmanconfig]. Note that even if the documentation
mentions that `branch` and `format` have default values, they still must be
defined in the `staticman.yml` configuration file.  Lesson learned through the
hard way.

The beautifulhugo theme already has built-in support for staticman-based
comments. All you have to do is setting the `comments` and `api` fields inside
the `params` section of your `config.yaml`:

```yaml
…
params:
  comments: true
  staticman:
    api: "https://staticman3.herokuapp.com/v3/entry/gitlab/<username>/<projectname>/master/comments"
…
```

In the `api` field, replace `<username>` and `<projectname>` with your GitLab
username and the project name used for the website respectively.

The last thing you need to do, is to allow the staticman web service to create
pull requests in your repository. Go to your project's GitLab page, click on
_Settings_, _Members_, and then search for the _staticmanlab_ user and give him
_Developer_ permissions.

The beautifulhugo theme displays several input fields in the form to create a
new comment. Unfortunately, is not possible to configure which fields to
display based solely on the configuration. Therefore, if you are not interested
in any of those you must edit
`themes/beautifulhugo/layouts/partials/staticman-comments.html` and remove the
fields you are not interested in.


## Adding a Custom Domain

GitLab Pages allows you to use a custom domain so that your website also
becomes also available through the  `https://your.domain` or
`https://www.your.domain` web addresses, in addition to the one already
provided by GitLab Pages.

First, you need to purchase the domain that you want to use. There are a couple
of domain registrars. I chose [domain.com] for mine as it had good reviews and
fair prices. Don't bother to pay extra for a SSL/TLS certificate as [Let's
Encrypt] provides one for free. Besides, GitLab integrates now with Let's
Encrypt in a way that you don't have to download the certificates yourself and
pass the validation test which proves you own the domain.

After you purchased the domain, go to the GitLab page for your project, click
on _Settings_, _Pages_, and then on the _New Domain_ button. Write the name of
the domain that you had purchased and click on _Create New Domain_. You should
now be seeing a page displaying a `CNAME` and `TXT` DNS records. Ignore the
`CNAME` DNS record, as not all registrars support using a `CNAME` for the root
domain and that also prevents you to use the domain for an email server if you
ever want it. You can read more about the issue [here][cname].

But let's crack on, as my project manager used to say. Go to your domain
registrar's web admin interface. If there is already an existing record of type
`A` and named with the domain that you have purchased or otherwise named as
`@`, edit that record. Otherwise, create a new DNS record of type `A`. Type `@`
in the name field (`@` is an alias for your custom domain name) and
`35.185.44.232` in the content field.  This is the IP address of the GitLab
Pages server. Any value will do for the `TTL` field.

Now, create a record of type `TXT`. The name field for this record should be
set with the part before `TXT` in the text displayed on the _Verification
status_ section of the domain's page on GitLab (e.g.
`_gitlab-pages-verification-code.example.com`). The content field should be set
with the part after `TXT` (e.g. `gitlab-pages-verification-code=1c3e…`).

After this is completed, you need to ocasionally press the retry button in the
domain's page on GitLab until GitLab is able to verify that the domain is
effectively yours. You might have to wait a couple of hours until the DNS
updates propagate and the verification finally succeeds.

If you want your website to be available in the `https://www.your.domain` web
address as well, you need to create a record of type `CNAME`, with the name set
to `www` and the content to `your.domain`. Then you need to repeat the process
of adding a domain in GitLab, including adding a new `TXT` record for
verification purposes.

To wind it up, update the `baseurl` field in your `config.yaml` to use your
custom domain.

The picture below highlights the DNS records that I had to add to configure my
custom domain.

![Profile Picture](/dns-zone-settings.png)

Another option, in case you don't want to purchase a custom domain, is to make
your website available at the more friendly `https://<username>.gitlab.io`
address, by renaming the project to the following special format:
`<username>.gitlab.io`. GitLab calls this a user page.

That's all for now folks. Enjoy your new blog website!

[WordPress]: https://wordpress.com/
[GitLab Pages]: https://about.gitlab.com/stages-devops-lifecycle/pages/
[Jekyll]: https://jekyllrb.com/
[Hugo]: https://gohugo.io/
[beautifulhugo]: https://github.com/halogenica/beautifulhugo/archive/master.zip
[staticman]: https://staticman.net/a
[staticmanconfig]: https://staticman.net/docs/configuration
[gitlab-pages-job]: https://docs.gitlab.com/ee/ci/yaml/#pages
[CGI]: https://en.wikipedia.org/wiki/Common_Gateway_Interface
[domain.com]: https://www.domain.com/
[cname]: https://www.freecodecamp.org/news/why-cant-a-domain-s-root-be-a-cname-8cbab38e5f5c/
[Let's Encrypt]: https://letsencrypt.org/
[TOML]: https://github.com/toml-lang/toml
[online converter tool]: https://toolkit.site/format.htmla
