---
title: Debugging shell scripts with strace
date: 2020-05-16
tags:
- Shell Scripting
---

Imagine that we had to create a wrapper shell script that performed some tasks
and then called the main script or command. The same command line arguments
given to the wrapper script would also be forwarded to the main script.

For demonstration purposes, let's assume that the main script is called
`printargs` and its only purpose is to print the first three positional
parameters that were set:

```sh
#!/bin/sh

printf "arg1: '%s'\n" "$1"
printf "arg2: '%s'\n" "$2"
printf "arg3: '%s'\n" "$3"
```

Let's also assume that we had the following unimaginatively called `wrapper`
script:

```sh
#!/bin/sh

sh -c '
   # ...
   # Do some work here
   # ...
  ./printargs "$@"
' -- "$@"
```

Some explanation might be due here. The `--` argument on line 7 is interpreted
in a special way by the `sh` command: it marks the end of options and the start
of the arguments that will be used to construct the shell positional parameters
(`$1`, `$2`, ...). Double quoting `$@` is necessary to prevent the shell to
split any argument by a whitespace character, or more precisely, by any
character set in the `IFS` variable. It might look strange to run the main
script inside a new shell spawned by `sh -c`, and in most cases this is not
necessary. A situation where using this indirection is required, is when we need
to run multiple commands as another user with `sudo`. In this case, the starting
line would become `sudo sh -c '...'`. Another prominent example where the `sh -c
'...'` syntax is useful is with the `-exec` option of the `find` command.

Now, if we called this wrapper script with `a "b c"` as arguments, the result
would be:

```
$ ./wrapper a "b c"
arg1: 'a'
arg2: 'b c'
arg3: ''
```

Good. That's what we expected. Our arguments were correctly separated into the
shell positional parameters.

However, if the wrapper script had been written as:


```sh
#!/bin/sh

sh -c "
   # ...
   # Do some work here
   # ...
  ./printargs $@
"
```

The result would be more unpredictable:

```
$ ./wrapper a "b c"
arg1: 'a'
arg2: ''
arg3: ''
```

This result surprised me and is the reason for this post. I expected the
arguments to not be correctly separated into the shell positional parameters in
this case, but not for the `b c` argument to disappear in a puff of smoke.

This where strace came handy. strace is a tool that enables inspecting which
system calls a process executed, and which arguments were used.

So let's run the last example again but this time analysing it with strace:

```
$ strace -f -e execve ./script.sh a "b c"
execve("./script.sh", ["./script.sh", "a", "b c"], 0x7ffc6fd0b2b8 /* 55 vars */) = 0
strace: Process 71827 attached
[pid 71827] execve("/usr/bin/sh", ["sh", "-c", "./printargs a", "b c"], 0x5585a725e7f0 /* 55 vars */) = 0
[pid 71827] execve("./printargs", ["./printargs", "a"], 0x561fcfe779d0 /* 55 vars */) = 0
arg1: 'a'
arg2: ''
arg3: ''
```

The `-f` option configures strace to follow any fork of the process, while the
`-e` option restricts the system calls to be analysed to the ones in the
`execve` group.

The strace log give us some insight about the shell behaviour. Expanding `$@` in
the argument for the `-c` option caused only the first argument in `$@` to be
part of execution string for the `printargs` command. The remaining arguments in
`$@` became part of argument list for the `sh` command. This caused them to be
ignored as `-c` only uses one argument. Therefore, `printargs` was only invoked
with a single argument, which explains the outcome.

This is an example of how strace can be very useful to debug the argument list
created by the shell to invoke other commands.
