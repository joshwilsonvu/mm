# `@mm/moduleslist`

![CI status](https://github.com/joshwilsonvu/mm/workflows/CI/badge.svg)
[![npm version](https://img.shields.io/npm/v/@mm/moduleslist)](https://yarnpkg.com/package/@mm/moduleslist)

The list of all MagicMirror modules.

## Usage

`@mm/moduleslist` exports a single array of module entries. Each
entry has a `name`, an `author`, a `description`, the `repository`
containing the source code, and a `category` for organization.

```typescript
const moduleslist = require("@mm/moduleslist");

console.log(
  moduleslist.filter(mod => mod.name === "MMM-SystemTemperature")
)
// [
//   {
//     name: 'MMM-SystemTemperature',
//     author: 'MichMich',
//     description: "Display your Raspberry Pi's processor temperature on your MagicMirror.",
//     repository: 'https://github.com/MichMich/mmm-systemtemperature',
//     category: 'Utilities, IOT, and Services'
//   }
// ]

console.log(
  new Set(moduleslist.map(mod => mod.category))
)
// Set {
//   'Development and Core',
//   'Finance',
//   'News, Religion, and Information',
//   'Transport and Travel',
//   'Voice Control',
//   'Weather',
//   'Sports',
//   'Utilities, IOT, and Services',
//   'Entertainment and Miscellaneous',
//   'Health'
// }
```

## Contributing

Have you made a new MagicMirror module? Please contribute!

The [`data.yaml`](./lib/data.yaml) file lists all of the known
third-party Magic Mirror modules. It replaces the "3rd Party
Modules" GitHub Wiki page.

Using a list committed to GitHub and published to npm enables tools like
`@mm/cli` to intelligently install and upgrade third-party modules.
The documentation website will also display this list in a more
readable format.

To add your module to the list, just send a Pull Request that adds
an entry to the file that looks like the following:

```yml
<Category>:
 - name: <name>
   author: <author>
   description: <description line 1>
     <optional description line 2>
   repository: "https://github.com/<user>/<repository>"  # Must be a GitHub url
```

You can make the changes without leaving GitHub.

Please try to place your module in an existing category. If none of
the existing categories describe your module, a new category may be
approved if similar modules might also use it.
