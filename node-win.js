"use strict";

/**
 * Emulation of browser `window` and `dom`. Just enough to make ITSA work.
 *
 *
 * <i>Copyright (c) 2014 ITSA - https://github.com/itsa</i>
 * New BSD License - http://choosealicense.com/licenses/bsd-3-clause/
 *
 * @module node-win
 * @class window
 * @static
*/

require('js-ext/lib/array.js');

var xmlhttprequest = require('./lib/XMLHttpRequest.js').XMLHttpRequest,
    createHashMap = require('js-ext/extra/hashmap.js').createMap,
    xmlDOMParser = require('xmldom').DOMParser,
	Url = require('url'),
    used = createHashMap(),
    vNodeParser = /(?:(^|#|\.)([^#\.\[\]]+))|(\[.+?\])/g,
    count, doc, win, getHTML, reset;
    EventTypes = createHashMap({
		MouseEvents: function () {
			this.initMouseEvent = function (type, bubbles, cancelable, view, detail,
					screenX, screenY, clientX, clientY,
					ctrlKey, altKey, shiftKey, metaKey,
					button, relatedTarget) {
				count('initMouseEvent');
				this.ev = {
					type:type,
					bubbles:bubbles,
					cancelable:cancelable,
					view:view,
					detail:detail,
					screenX:screenX,
					screenY:screenY,
					clientX:clientX,
					clientY:clientY,
					ctrlKey:ctrlKey,
					altKey:altKey,
					shiftKey:shiftKey,
					metaKey:metaKey,
					button:button,
					relatedTarget:relatedTarget
				};
			};
		}
	});

count = function (method) {
	if (!used[method]) {
		used[method] = 1;
	} else {
		used[method] += 1;
	}
};

getHTML = function (node) {
	var prop, val,
		style, styles = [],
		html = '';

	if (!node.nodeName && node.nodeValue) {
		// For text nodes, I return the uppercase text
		// so that you can tell the parts generated at the server
		// from the normal lowercase of the actual app when run on the client
		return node.nodeValue.toUpperCase();
	}
	html += '<' + node.nodeName;
	for (prop in node) {
		val = node[prop];

		// Ignore functions, those will be revived on the client side.
		if (typeof val == 'function') continue;
		switch (prop) {
		case 'nodeName':
		case 'parentNode':
		case 'childNodes':
		case 'pathname':
		case 'search':
			continue;
		case 'checked':
			if (val == 'false') continue;
			break;
		case 'href':
			val = node.pathname;
			break;
		case 'className':
			prop = 'class';
			break;
		case 'style':
			if (val) {
				for (style in val) {
					if (val[style]) {
						styles.push(style + ': ' + val[style]);
					}
				}
				if (!styles.length) {
					continue;
				}
				val = styles.join(';');
			}
			break;
		}
		html += ' ' + prop + '="' + val.replace('"', '\\"') + '"';
	}

	if (node.childNodes.length) {
		html += '>' + node.childNodes.reduce(function (prev, node) {
			return prev + getHTML(node);
		}, '') + '</' + node.nodeName + '>';
	}
	else {
		// I don't know why Mithril assigns the content of textareas
		// to its value attribute instead of the innerHTML property.
		// Since it doesn't have children, the closing tag has to be forced.
		if (node.nodeName == 'TEXTAREA') {
			html += '></TEXTAREA>';
		} else {
			html += '/>';
		}
	}
	return html;
};


win = {
    cancelAnimationFrame: function() {

    },

    console: require('polyfill/lib/window.console.js'),

    CSSStyleDeclaration: {},

	document: doc,

    DOMParser: xmlDOMParser,

    HTMLCollection: Array,

    location: {},

	navigator: {
		userAgent: 'fake',
		stats: {
			clear: function () {
				used = {};
			},
			get: function () {
				return used;
			}
		},
		reset: reset,
		getHTML: function () {
			return getHTML(doc.body);
		},
		navigate: function (url) {
			var u = Url.parse(url, false, true);
			window.location.search = u.search || '';
			window.location.pathname = u.pathname || '';
			window.location.hash = u.hash || '';
		}
	},

    NodeList: Array,

	performance: function () {
		var timestamp = 50;
		this.$elapse = function(amount) {
			timestamp += amount;
		};
		this.now = function() {
			return timestamp;
		};
	},

	requestAnimationFrame: function(callback) {
		var instance = this;
		instance.requestAnimationFrame.$callback = callback;
		instance.requestAnimationFrame.$resolve = function() {
			instance.requestAnimationFrame.$callback && instance.requestAnimationFrame.$callback();
			instance.requestAnimationFrame.$callback = null;
			instance.performance.$elapse(20);
		};
	},

    XMLHttpRequest: xmlhttprequest

};

reset = function () {
	var body = doc.createElement('body');
	win.location.search = "?/";
	win.location.pathname = "/";
	win.location.hash = "";
	win.history = {};
	win.history.pushState = function(data, title, url) {
		win.location.pathname = win.location.search = win.location.hash = url;
	},
	win.history.replaceState = function(data, title, url) {
		win.location.pathname = win.location.search = win.location.hash = url;
	};
	doc.appendChild(body);
	doc.body = body;
};

reset();

module.exports = win;