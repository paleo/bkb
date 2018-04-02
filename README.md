# Bkb

[Open the Bkb Documentation.](https://github.com/paleo/bkb/wiki)

Bkb is a lightweight front-end framework. It is robust enough to be used in production, but the API is still not documented. And I will continue to redesign some part of the API until the version 1.0.0 will be published.

_Bkb_ is a non-opinionated framework. It does almost nothing:

- No virtual DOM or templating (neither *data binding*);
- No services (`http`, `router`, etc.);
- No data structuring (`redux`, `collections` & `models`, …).

To achieve these purposes, you will use the libraries you want.

_Bkb_ will help you to organize your code in a fashion that each part of your program is self contained and reusable. We call that a _component_ (it is not a _Web component_). At runtime, each instance of a *component* is located in a *tree*. Like the DOM elements and events, a component has the ability to emit and subscribe to events of its children, parents, etc.

This project is inspired from [Backbone.js](http://backbonejs.org/):

> In an ecosystem where overarching, decides-everything-for-you frameworks are commonplace, and many libraries require your site to be reorganized to suit their look, feel, and default behavior — Backbone should continue to be a tool that gives you the freedom to design the full experience of your web application.

## Install

    npm install bkb

## License

Public domain.

© 2017-2018 Paleo; Released under the [CC0 License](http://creativecommons.org/publicdomain/zero/1.0/).