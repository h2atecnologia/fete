# fete
Front End TEmplates - Light weight reactive JavaScript templates and routing

<ul>
<li>Small: 15.5K raw, 9K minified, 3K gzipped; ES5 - Transpiled, minified, gzipped 5K.</li>
<li>Base version works in recent releases of Chrome, Firefox, Edge. Transpiling not required.</li>
<li>Zero dependencies</li>
<li>Requires less boilerplate and set-up code than React, Angular, Vue, or Marko.</li>
<li>Built-in bindings/normalizers for standard HTML UI controls: input, checkbox, radio, textarea, select, multi-select.</li>
<li><b>NEW!</b> <i>forEach</i>, <i>if</i> and <i>bind</i> attribute directives for HTML elements.</li>
<li>Uniform JavaScript string template syntax for HTML tag attributes and content, i.e. ${...expressions}.</li>
<li>Optional two-way data binding.</li>
<li>Extensible processor functions accessable through $.&lt;function name&gt;</li>
<li>Component based routers/controllers or functional pipelines.</li>
<li>Cascading regular expression based route matching.</li>
<li>Control flow based on UI events or data state.</li>
<li>Straight-forward model-view-controller paradigm where models or controllers are optional.</li>
<li>Views are just native HTMLElements.</li>
<li>Dependency tracking to ensure only views rendering data that has changed are updated.</li>
<li>Server support ... not yet</li>
</ul>

# installation

npm install fete

Then use the files from the browser directory. There is currently no server side support.

Or, just reference https://public.cachegit.com/anywhichway/fete/master/browser/fete.es5.js for an auto-minified ES5 Version.

# usage

See https://anywhichway.github.io/fete/

# release history (reverse chronological order)

2017-04-14 v1.2.1 Added forEach, if, and bind attribute directives. Enhanced examples in interactive documentation.

2017-03-29 v1.2.0 Optimized portions of core and made more extensible. Added $.element helper. Added Click Me! Example. Improved documentation. Depreacted $import in favor of $.include. $import will continue to work through v1.4.0.

2017-03-18 v1.1.1 Enhanced documentation, added "lazy" option to inputs, enhanced template parsing so function can return text or an HTMLElement. If an HTMLElement is returned its innerHTML, innerText, or wholetext is added to the containing template resolution.

2017-03-18 v1.1.0 Enhanced documentation, added functional pipelines.

2017-03-17 v1.0.0 initial public release

# license MIT
