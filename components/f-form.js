(function() {
	class FeteForm extends Fete.Component {
		connectedCallback() {
			const children = [].slice.call(this.children);
			this.innerHTML=`<form action="javascript:"><style>input:invalid{border-color:red;}</style></form>`;
			super.connectedCallback();
			for(let child of children) {
				this.firstChild.appendChild(child);
			}
		}
	}
	document.registerElement("f-form",FeteForm);
	window.FeteForm = FeteForm;
})();