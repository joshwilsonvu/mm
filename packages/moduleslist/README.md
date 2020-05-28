

# Contributing

Contributions are encouraged!

The [`data.yaml`](./lib/data.yaml) file lists all of the known
third-party Magic Mirror modules. It will replace the "3rd Party
Modules" GitHub Wiki page.

Using a list committed to GitHub and published to npm enables tools like
`@mm/cli` to intelligently install and upgrade third-party modules.
The documentation website will also display this list in a more
readable format.

To add your module to the list, just send a Pull Request that adds
an entry to the file that looks like the following:

```yml
<Category>:
 - name: <name>  # A comment
   author: <author>
   description: <description line 1>
     <optional description line 2>
     ...
   repository: "https://github.com/<user>/<repository>"
```

You can make the changes without leaving GitHub.

Please try to place your module in an existing category. If none of
the existing categories describe your module, a new category may be
approved if similar modules might also use it.
