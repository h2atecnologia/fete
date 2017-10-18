(function() {
	class FeteHTMLExample extends Fete.Component {
		run() {
			this.error.innerText = "";
			try {
				this.result.innerHTML = this.code.value;
				Fete.render(this.result);
			} catch(e) {
				this.error.innerText = e.stack;
			}
		}
		connectedCallback() {
			const autosize = event => {
					event.target.style.height = event.target.scrollHeight+"px";
				},
				text = this.firstElementChild.innerHTML;
			this.result = Fete.h("span");
			this.error = Fete.h("span");
			Fete.compile.bind(this)`<form onSubmit="${this.run}" action="javascript:"><table border="1" style="width:100%;border-collapse:collapse">
				<tr><td style="width:50px"></td><td>HTML</td><td>Result</td></tr>
				<tr><td style="vertical-align:top"><button type="submit">Run</button></td>
				<td style="vertical-align:top;width:45%;padding-right:8px"><textarea style="width:100%">${text}</textarea></td>
				<td style="vertical-align:top">${this.result}</td></tr>
				</tr>
				<tr><td>Errors</td><td colspan="2">${this.error}</td></tr></table></form>`;
			this.code = this.getElementsByTagName("textarea")[0];
			this.code.addEventListener("keydown",autosize);
			setTimeout(() => this.code.dispatchEvent(new Event("keydown")),10);
			window.addEventListener("resize",() => setTimeout(() => {this.code.style.height="0px";this.code.dispatchEvent(new Event("keydown"))}));
			!this.hasAttribute("run") || this.run();
		}
	}
	document.registerElement("f-html-example",FeteHTMLExample);
	window.FeteHTMLExample = FeteHTMLExample;
})();