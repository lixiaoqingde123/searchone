﻿/**
 * main.js
 * 
 * @date 2012/11/5
 */
(function (global, undefined) {

	var document = global.document;
	
	// 获取dom
	function $ (id) {
		return document.getElementById(id);
	}
	// 去除空格
	function trim (s) {
		return s.replace(/^\s+|\s+$/g, '');
	}
	// 添加事件句柄
	function addEvent (dom, type, callback) {
		if (!dom) {return;}
		if (dom.addEventListener) {
			dom.addEventListener(type, callback, false);
		}
		else if (dom.attachEvent) {
			dom.attachEvent('on' + type, callback);
		}
		else {
			dom['on' + type] = callback;
		}
	}
	// 为obj绑定方法
	function bind (func, obj) {
		return function () {
			func.apply(obj, arguments);
		};
	}


	/**
	 * 查找
	 * @Search
	 * @param {String} inputId 输入框id
	 * @param {String} submitId 提交按钮id
	 * @param {String} listId 列表id
	 * @param {String} submitUrl 提交链接
	 */
	function Search (config) {
		this.dom = {};
		this.dom.input = $(config.inputId);
		this.dom.submit = $(config.submitId);
		this.dom.list = $(config.listId);
		this.dom.del = $(config.deleteId);

		// 一旦提交就不可再次提交
		this._submitLock = false;

		this.submitUrl = config.submitUrl || '';
		this._funcPrev = config.funcPrev || '_cbfnc_';
		this._oldSuggestFunctionName;

		// 保证所需id都存在
		if (this.dom.input && this.dom.submit) {
			// 记录最先的推荐数据
			this._defaultList = this.dom.list && this.dom.list.innerHTML || '';
			this._init();
		}
	}
	Search.prototype = {
		/**
		 * 初始化事件
		 */
		_init: function () {
			if (this.dom.list) {
				addEvent(this.dom.input, 'focus', bind(this._eFocus, this));
				addEvent(this.dom.input, 'keyup', bind(this._eKeyup, this));
				addEvent(this.dom.del, 'click', bind(this._eClearInput, this));
				addEvent(this.dom.list, 'click', bind(this._eSuggestClick, this));

				// 点击区域外关闭
				addEvent(this.dom.list.parentNode, 'click', bind(function (evt) {
						evt = evt || global.event;
						if (evt.stopPropagation) {
							evt.stopPropagation();
						}
						else {
							evt.cancelBubble = true;
						}
					}, this));
				addEvent(document, 'click', bind(function (evt) {
						this.hideList();
					}, this));
			}
			// 不出list
			else {
				addEvent(this.dom.del, 'click', bind(function () {
						this.dom.input.value = '';
						this.dom.input.focus();
					}, this));
				addEvent(this.dom.input, 'keyup', bind(function (evt) {
						evt = evt || global.event;

						// 回车键提交
						if (evt.which === 13) {
							this.submit();
						}

						if (this.getValue()) {
							this.showDel();
						}
						else {
							this.hideDel();
						}
					}, this));
				addEvent(this.dom.input, 'focus', bind(function (evt) {
						if (this.getValue()) {
							this.showDel();
						}
						else {
							this.hideDel();
						}
					}, this));
			}
			addEvent(this.dom.submit, 'click', bind(this._eSubmit, this));
		},
		/**
		 * 事件处理
		 */
		_eFocus: function (evt) {
			if (!this.getValue()) {
				this.dom.list.innerHTML = this._defaultList;
				this.showList();
			}
			else {
				this.requestNewSuggest();
			}
			//this.showList();
		},
		_eKeyup: function (evt) {
			evt = evt || global.event;

			// 回车键提交
			if (evt.which === 13) {
				this.submit();
			}
			else {
				this.requestNewSuggest();
			}
		},
		_eClearInput: function (evt) {
			this.dom.input.value = '';
			this.dom.list.innerHTML = this._defaultList;

			evt = evt || global.event;
			if (evt.preventDefault) {
				evt.preventDefault();
			}
			else {
				evt.returnValue = false;
			}
		},
		_eSubmit: function (evt) {
			this.submit();
		},
		_eSuggestClick: function (evt) {
			var target, className;

			evt = evt || global.event;
			target = evt.target || evt.srcElement;
			className = target.className || '';

			this.dom.input.value =
				target.tagName.toUpperCase() === 'LI' ? target.innerText : target.parentNode.innerText;
			if (className.indexOf('icon_add') === -1) {
				this.hideList();
				this.submit();
			}
			else {
				this.dom.input.focus();
				this.requestNewSuggest();
			}
		},
		showList: function () {
			if(this.dom.list) { this.dom.list.style.display = 'block'; }
		},
		hideList: function () {
			if(this.dom.list) { this.dom.list.style.display = 'none'; }
		},
		showDel: function () {
			if(this.dom.del) { this.dom.del.style.display = 'block'; }
		},
		hideDel: function () {
			if (this.dom.del) { this.dom.del.style.display = 'none'; }
		},
		/**
		 * 获取value值
		 * @return {String} 输入值
		 */
		getValue: function () {
			return trim(this.dom.input.value);
		},
		/**
		 * 提交
		 */
		submit: function () {
			var v = this.getValue();

			if (!this._submitLock && v) {
				this._submitLock = true;
				// 跳转 或 form提交
				document.location = this.submitUrl + '?key=' + v;
			}
		},
		requestNewSuggest: function () {
			var v = this.getValue(),
				script, funcName;

			if (v) {
				// 与上次不同则新请求
				if (v === this._oldValue) {
					this.showList();
				}
				else {
					this._oldValue = v;
					// 保证返回顺序
					if (this._oldSuggestFunctionName) { // 删除旧的
						delete global[this._oldSuggestFunctionName];
					}
					funcName = this._funcPrev + (new Date().getTime() + Math.round(Math.random() * 1000)); 
					funcName = this._funcPrev + '1234567'; // 本行测试用
					this._oldSuggestFunctionName = funcName;
					global[funcName] = bind(function (data) {
						this.showNewSuggest(data);
						delete global[funcName];
					}, this);
					// 请求新的数据
					script = document.createElement('script');
					script.src = 'data/new_suggest.js?value=' + v + '&callback=' + funcName;
					document.getElementsByTagName('head')[0].appendChild(script);
				}
			}
			// 空白
			else {
				this.dom.list.innerHTML = this._defaultList;
			}
		},
		/**
		 * 显示新的suggest
		 */
		showNewSuggest: function (data) {
			var len = data.list && data.list.length,
				i = 0,
				html = ['<ul>'],
				className;
			if (len > 0) {
				for (; i < len; i++) {
					if (i === 0) {
						className = 'first';
					}
					else if (i === len - 1) {
						className = 'last';
					}
					else {
						className = null;
					}
					html.push(
						'<li' + (className ? ' class="' + className + '"' : '') + '>' +
						'	<i class="icon icon_search"></i>' +
						'	' + data.list[i] +
						'	<i class="icon icon_add"></i>' +
						'</li>'
					);
				}
				html.push('</ul>');
				this.dom.list.innerHTML = html.join('');
				this.showList();
			}
			else if (len === 0) {
				this.hideList();
			}
		}
	};


	/**
	 * ajax请求
	 *
	 * @method	ajax
	 *
	 * @param {Object} options 一个配置对象
	 * @return {Object} ajax 返回一个ajax对象
	 */
	function Ajax (){
		this.request = this.getRequest();
	}
	Ajax.prototype = {
		getRequest: function () {
			var request,
				versions,
				i, len;

			if (global.XMLHttpRequest) {
				request= new XMLHttpRequest;
				//有些浏览器需要设置mime类型，如果存在重写mime类型的属性就进行设置
				if(request.overrideMimeType) {
					request.overrideMimeType('text/xml');
				}   
			}
			else if (global.ActiveXObject) {
		　　　　 //搞定兼容性
				versions = ['Microsoft.XMLHTTP', 'MSXML.XMLHTTP', 'Microsoft.XMLHTTP', 'Msxml2.XMLHTTP.7.0', 'Msxml2.XMLHTTP.6.0', 'Msxml2.XMLHTTP.5.0', 'Msxml2.XMLHTTP.4.0', 'MSXML2.XMLHTTP.3.0', 'MSXML2.XMLHTTP'];
				for (i=0, len = versions.length; i < len; i++) {
					try{
						request=new ActiveXObject(versions[i]);
						if(request){
							return request;
						}
					}catch(e){
						request=false;
					}   
				}
			}
			return request;
		},
		get: function(url,func){
			this.request.open('get',url);
			this.request.send(null);
			this.onreadystatechange(func);      
		},
		post: function(url,data,func){
			this.request.open('post',url);
			this.request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
			this.request.send(data);
		},
		//回调函数
		onreadystatechange: function(func){
			var me = this;
			this.request.onreadystatechange=function(){
				if(me.request.readyState==4){
					if(me.request.status==200){
						func(me.request.responseText);
					}
				}   
			};
		}
	};




	// -------------------------------------------
	// 页面实例
	new Search({
		inputId:   'searchInput',          // 输入框id
		submitId:  'searchSubmit',         // 提交按钮id
		listId:    'searchList',           // 列表id
		deleteId:  'searchDel',            // 删除输入内容的按钮id
		submitUrl: '搜索%20-2第二页.html'  // 提交链接，搜索数据拼在url后面
	});

	// 加载下一页
	(function () {
		var nextPage = $('nextPage'),
			nextPageLoading = $('nextPageLoading'),
			pageNumber = 1;

		addEvent(nextPage, 'click', bind(function (evt) {
				var target;
				evt = evt || global.event;
				target = evt.target || evt.srcElement;

				// 返回顶部
				if (target.className.indexOf('return_top') >= 0) {
					global.document.getElementsByTagName('body')[0].scrollTop = 0;
				}
				// 加载下一页
				else {
					nextPage.style.display = 'none';
					nextPageLoading.style.display = 'block';
					
					// 测试数据路径
					new Ajax().get('data/new_page_data.js', function (data) {
							var div, page;
							if (data) {
								page = '<a class="page_num" href="#">第' + (++pageNumber) + '页</a>';
								div = global.document.createElement('div');

								div.innerHTML = page + data;

								nextPage.parentNode.insertBefore(div, nextPage);

								nextPage.style.display = 'block';
								nextPageLoading.style.display = 'none';
							}
							else {
								nextPageLoading.innerHTML = '已是最后一页';
							}
						});
				}

				if (evt.preventDefault) {
					evt.preventDefault();
				}
				else {
					evt.returnValue = false;
				}
			}, this));
	})();


})(this);
