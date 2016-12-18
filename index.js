import ObservStructA from 'observ-struct-a';
import ObservMeta from 'observ-meta';
import ObservValue from 'observ';

let { obs: pageState, obsobs: pageObs } = ObservMeta({ title: "Loading..." });

let noop = () => {};

let currentUrl = ObservValue(document.location.href);
window.addEventListener('popstate', e =>
{
  navState.isNavigating.set(true);
  currentUrl.set(document.location.href);
  navigate(document.location.href, { state: history.state });
});

export let navState = ObservStructA({
  currentUrl,
  pageState,
  pageObs,
  pageRenderer: null,
  pageDisposer: ObservValue(function() {}),
  isNavigating: false,
});

let router = () => { throw new Error("Please call setRouter to set your router function"); };
export function setRouter(r) { router = r; }

currentUrl(href =>
{
  if (navState.isNavigating())
  {
    return;
  }
  
  navigate(href, { state: history.state });
});

export async function navigate(href, opts)
{
  opts = Object.assign({ history: 'pushState' }, opts);
  
  // try canceling previous navigation. TODO: consider not doing it if href is same?
  // TODO: event?
  navigate.cancel();
  
  navState.isNavigating.set(true);
  let newPageState, disposeSignal, page, pageDisposer;
  let cancelled = false;
  try
  {
    let url = new URL(href, document.location.origin);
    if (url.hash.startsWith('#/')) url = new URL(url.hash.slice(1), document.location.origin);
    
    opts.fullUrl = url;
    page = router(url.pathname + url.search, opts);
      
    if (page == null)
    {
      // TODO: figure out graceful way to handle 404s
      throw new Error('Could not resolve ' + href);
    }
    
    let disposePromise = new Promise(resolve => pageDisposer = resolve);
    disposeSignal = disposePromise.then.bind(disposePromise);
    disposeSignal(() => cancelled = true);
    navigate.cancel = disposeSignal;
    
    if (page instanceof Promise)
    {
      page = await Promise.race(disposePromise, page);
      if (cancelled) return;
    }
    
    newPageState = page(opts, disposeSignal);
    
    if (newPageState.ready instanceof Promise)
    {
      await Promise.race(disposePromise, newPageState.ready);
      if (cancelled) return;
    }
    
    if (opts.history)
    {
      let pageStateVal = newPageState();
      let historyFunc = typeof opts.history === 'function'
        ? opts.history
        : window.history[opts.history].bind(window.history);
      historyFunc(pageStateVal, pageStateVal.title, href);
      
      currentUrl.set(href);
    }
  }
  catch (e)
  {
    if (disposeSignal) disposeSignal();
    
    throw e;
  }
  finally
  {
    navState.isNavigating.set(false);
    navigate.cancel = noop;
  }
  
  // trigger previous page's disposeSignal
  navState.pageDisposer()();
  
  // TODO: remember scroll position?
  
  navState.set({
    pageObs: newPageState,
    pageRenderer: page.render,
    pageDisposer,
    isNavigating: false,
  });
}

navigate.cancel = noop; // TODO: getter property over variable

export function registerAnchorEvents(delegator)
{
  // TODO: also register escape for navigate cancellation
  // TODO: intercept submit event?
  delegator.addGlobalEventListener('click', e  =>
  {
    let target = e.target;
    if (target.tagName !== 'A' || target.target) return;
    if (e.which !== 0 || e.ctrlKey || e.altKey || e.shiftKey || e.metaKey) return;
    
    // TODO: check target href origin
    navigate(target.href, { history: 'pushState' });
    e.preventDefault();
  });
}
