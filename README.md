mercury-navigator
=================

A router for the mercury framework.

Features:
- Page lifecycle: 
- Async navigation: you may optionally return promises from page factories and the router
- Cancellation: `navigate.cancel()`
- PushState history
- Restore state

TODO:
- Scroll position restoration?
- Automatically save page state via history.replaceState?
  - Or maybe just title?

Documentation (in progress)
---------------------------

```
import hg from 'mercury';

import { registerAnchorEvents, setRouter, navigate, navState } from 'mercury-navigator';

import Foo from './pages/foo';
// where Foo is a function that (may asynchronously) return a new state observable
// and Foo.render is a render function

setRouter((href, opts) =>
{
  switch (href)
  {
    case '/foo': return Foo;
    // etc.
  }
});

// listens to un-modified left click events from <a> elements, calls navigate with history: 'pushState'
registerAnchorEvents(hg.Delegator());

hg.Delegator().addEventListener(document.body, 'keydown', e =>
{
  
});

// you should navigate to the current location for your initial page load
let initialNavigatePromise = navigate(document.location.href, { history: 'replaceState' });
```

### `router`

Arguments:
- href: path and querystring of the href passed
- opts: copy of object passed to navigate, with an additional property (below)
- opts.fullUrl: URL object for href

Returns: either directly or as a promise, a function to create a page state:
- (opts, disposeSignal) => observable
  - argument `opts`: as passed to router
  - argument `disposeSignal(callback)`: callback is invoked when page should dispose itself
  - returned observable property `.ready`: optional, if a promise, navigation will await it
- `.render`: a property on the returned function, to render the page

### `navigate`

Arguments:
- href: url to navigate to, relative to current location; if the url has a fragment that begins with '/', treat the fragment as the href when invoking `router`
- opts: an object with any properties you'd like to pass to router and the page factory
  - `.history`: either a function or the name of a method on the `window.history` object, or null. Defaults to "pushState".

