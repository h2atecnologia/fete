(function() {
	class FeteExample extends Fete.Component {
		run() {
			this.error.innerText = "";
			try {
				const model = new Function("return " + this.model.value)();
				this.result.innerHTML = this.code.value;
				Fete.render(this.result,model);
			} catch(e) {
				this.error.innerText = e.stack;
			}
		}
		connectedCallback() {
			const autosize = event => event.target.style.height = event.target.scrollHeight+"px",
				model = this.childNodes[0].wholeText,
				text = this.children[0].innerHTML;
			this.result = Fete.h("span");
			this.error = Fete.h("span");
			Fete.compile.bind(this)`<form onSubmit="${this.run}" action="javascript:"><table border="1" style="width:100%;border-collapse:collapse">
				<tr><td style="width:50px"></td><td colspan="2">Model</td></tr>
				<tr><td rowspan="3" style="vertical-align:top"><button type="submit">Run</button></td>
					<td colspan="2" style="padding-right:8px"><textarea style="width:100%" name="model">${model}</textarea></td></tr>
				<tr><td>HTML</td><td>Result</td></tr>
				<tr>
				<td style="vertical-align:top;width:45%;padding-right:8px"><textarea style="width:100%" name="html">${text}</textarea></td>
				<td style="vertical-align:top">${this.result}</td></tr>
				</tr>
				<tr><td>Errors</td><td colspan="2">${this.error}</td></tr></table></form>`;
			this.model = this.querySelector("[name=model]");
			this.code = this.querySelector("[name=html]");
			this.model.addEventListener("keydown",autosize);
			this.code.addEventListener("keydown",autosize);
			setTimeout(() => this.model.dispatchEvent(new Event("keydown")),10);
			setTimeout(() => this.code.dispatchEvent(new Event("keydown")),10);
			window.addEventListener("resize",() => setTimeout(() => {
				this.model.style.height="0px";this.model.dispatchEvent(new Event("keydown"));
				this.code.style.height="0px";this.code.dispatchEvent(new Event("keydown"));
			}));
			!this.hasAttribute("run") || this.run();
		}
	}
	document.registerElement("f-fete-example",FeteExample);
	window.FeteExample = FeteExample;
})();