import ObservStructA from 'observ-struct-a';
import ObservMeta from 'observ-meta';
import ObservValue from 'observ';

// override these in your loader config?
//import appRoute from 'app-route';
export let appRoute = (href, context, opts) =>
{
  let page = (ctx, opts, disposeSignal) => ObservValue('Please override the appRoute export');
  page.render = pageState =>
  {
    throw new Error('Please override the appRoute export');
  };
  
  return {
    page,
    context,
  };
};

let { obs: pageState, obsobs: pageObs } = ObservMeta({ title: "Loading..." });

let currentUrl = ObservValue(document.location.href);
window.addEventListener('popstate', e =>
{
  currentUrl.set(document.location.href);
});

export let navState = ObservStructA({
  currentUrl,
  pageState,
  pageObs,
  pageRenderer: null,
  pageDisposer: ObservValue(function() {}),
  isNavigating: false,
});


currentUrl(href =>
{
  if (navState.isNavigating())
  {
    return;
  }
  
  navigate(href);
});

export async function navigate(href, opts)
{
  opts = opts || {};
  
  navState.isNavigating.set(true);
  let newPageState, disposeSignal, page, pageDisposer;
  let cancelled = false;
  try
  {
    let url = new URL(href);
    if (url.hash.startsWith('#/')) url = new URL(url.hash.substr(), document.location.origin);
    
    let context = {
      fullUrl: url,
      baseUri: '',
    };
    let res = appRoute(url.pathname + url.search, context, opts);
      
    if (res == null)
    {
      // TODO: figure out graceful way to handle 404s
      throw new Error('Could not resolve ' + href);
    }
    
    if (res instanceof Promise) res = await res;
    
    page = res.page;
    context = res.context;
    
    let disposePromise = new Promise(resolve => pageDisposer = resolve);
    disposeSignal = disposePromise.then.bind(disposePromise);
    
    disposeSignal(() => cancelled = true);
    
    // TODO: restore state from history.state
    newPageState = page(context, opts, disposeSignal);
    
    if (!cancelled && newPageState.ready instanceof Promise) await newPageState.ready;
    
    if (cancelled) return;
    
    // trigger previous page's disposeSignal
    navState.pageDisposer()();
    
    if (opts.history)
    {
      let pageStateVal = newPageState();
      let historyFunc = typeof opts.history === 'function'
        ? opts.history
        : window.history[opts.history].bind(window.history);
      historyFunc(pageStateVal, pageStateVal.title, href);
    }
    
    currentUrl.set(href);
    
    // TODO: remember scroll position
  }
  catch (e)
  {
    if (disposeSignal) disposeSignal();
    
    throw e;
  }
  finally
  {
    navState.isNavigating.set(false);
  }
  
  navState.set({
    pageObs: newPageState,
    pageRenderer: page.render,
    pageDisposer,
    isNavigating: false,
  });
}

export function registerAnchorEvents(delegator)
{
  delegator.addEventListener(document.body, 'click', e  =>
  {
    let target = e.target;
    if (target.tagName !== 'A' || target.target) return;
    if (e.which !== 0 || e.ctrlKey || e.altKey || e.shiftKey || e.metaKey) return;
    
    navigate(target.href, { history: 'pushState' });
    e.preventDefault();
  });
}
