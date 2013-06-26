/**
 * Javascript inheritance
 * Source: http://joshgertzen.com/object-oriented-super-class-method-calling-with-javascript/
 */
//Defines the top level Class
function Class() { }
    Class.prototype.construct = function() {};
    Class.extend = function(def) {
      var classDef = function() {
        if (arguments[0] !== Class) { this.construct.apply(this, arguments); }
      };
 
      var proto = new this(Class);
      var superClass = this.prototype;
 
      for (var n in def) {
        var item = def[n];                      
        if (item instanceof Function) item.$ = superClass;
        proto[n] = item;
      }
 
      classDef.prototype = proto;
 
      //Give this new class the same static extend method    
  classDef.extend = this.extend;      
  return classDef;
};

var TwoPlus = {
  scope: false,
  readyHandlers: [],
  document: false, // holds documentApi
};

TwoPlus.createRDL = function(rdl) {
  var obj = { "type" : "rdl", "data" : JSON.parse(JSON.stringify(rdl)) };
  return obj;
}

TwoPlus.createNotification = function(notification) {
  var obj = { "type" : "webAppNotification", "data" : JSON.parse(JSON.stringify(notification)) };
  return obj;
}

// called from host
TwoPlus.__init = function(scope) {
	this.scope = scope;
	for (i=0;i<this.readyHandlers.length;i++) {
		this.readyHandlers[i]();
	}
	this.readyHandlers = null;
}

// ddx requires methods in global namespace
TwoPlusInit = function(scope) {
	TwoPlus.__init(scope);
}

TwoPlus.isInstalled = function(ignoreLegacy) {
	// 'legacy' includes a check to see if the iOS objectiveC 2Plus app is installed.

	// this check must currently be runnable _before_ the platforms initialize
	// TwoPlus (eg, before TwoPlus.scope is available)
	return navigator.userAgent.indexOf("MSIX") != -1 ||
		(!ignoreLegacy && navigator.userAgent.indexOf("OSIX") != -1);
}

TwoPlus.getPasteboard = function() {
	return TwoPlus.scope.pasteboard;
}

TwoPlus.getIdentity = function() {
    return TwoPlus.scope.identity;
}

TwoPlus.ready = function(handler) {
	if (this.readyHandlers == null) {
	  handler();
	} else { 
	  this.readyHandlers.push(handler);
	}
}

TwoPlus.getFeed = function(feedId) {
	if (!feedId) feedId = TwoPlus.scope.feedId;
	if (!feedId) return false;
	return {
		post: function(obj, success, error) {
			var send = JSON.parse(JSON.stringify(obj));
			send.feed = feedId;
			$.ajax({
			      type: 'POST',
			      url: TwoPlus.scope.host + "/post",
			      data: JSON.stringify(send),
			      headers: {"Authorization" : TwoPlus.scope.accessToken },
			      success: success,
			      error: error,
			      dataType: "json",
			      contentType: "application/json; charset=utf-8",
			    });
		}
	};
}

TwoPlus.getParameterByName = function(name) {
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}




// ----------------- Platform Implementations ----------------- //

var DDXDocumentApi = Class.extend(
  /** @lends DDXDocumentApi# */
  {
	ddx: false, // will hold a DDX instance
    watchedDocuments: {},

    /**
     * @constructs
     */
    construct: function(ddx) {
      this.ddx = ddx;
    },

    create: function(successCallback, errorCallback) {
      this.ddx.send("CreateDocument", {}, successCallback, errorCallback);
    },

    get: function(docref, successCallback, errorCallback) {
      var req = { "Document": docref };
      this.ddx.send("GetDocument", req, function(rawDoc) {
      	successCallback(JSON.parse(rawDoc));
      }, errorCallback);
    },

    update: function(docref, func, params, successCallback, errorCallback) {
      var req = { "Document" : docref,
                  "Command" : func.toString(), 
                  "Parameters" : JSON.stringify(params),
                };
      this.ddx.send("UpdateDocument", req, function(rawDoc) {
		successCallback(JSON.parse(rawDoc));
      }, errorCallback);
    },

    watch: function(docref, updateCallback, responseCallback, errorCallback) {
      var req = { "Document" : docref };
      this.watchedDocuments[docref] = updateCallback;
      this.ddx.send("WatchDocument", req, responseCallback, function(error) {
        delete this.watchedDocuments[docref];
        errorCallback(error);
      });
    },

    unwatch: function(docref, responseCallback, errorCallback) {
      var req = { Document: docref };
      delete this.watchedDocuments[docref];
      this.ddx.send("UnwatchDocument", req, responseCallback, errorCallback);
    },
});


var IOSLegacyDocumentApi = Class.extend(
  /** @lends IOSLegacyDocumentApi# */
  {
    watchedDocuments: {},

    /**
     * @constructs
     */
    construct: function() {
    },

    create: function(success, error) {
      this.doGet("/document/create", success, error);
    },

    get: function(docref, callback, error) {
      var doc = { Document: docref };
      this.doPost("/document/shared/get", doc, callback, error); 
    },

    update: function(docref, func, params, callback, error) {
      var req = { "Document" : docref,
                  "Command" : func.toString(), 
                  "Parameters" : JSON.stringify(params),
                };
      this.doPost("/document/shared/update", req, callback, error);
    },

    watch: function(docref, updateCallback, responseCallback, errorCallback) {
      var req = { "Document" : docref };
      this.watchedDocuments[docref] = updateCallback;
      this.doPost("/document/shared/watch", req, function(response) {
        responseCallback(response);
      }, function(error) {
        delete this.watchedDocuments[docref];
        errorCallback(error);
      });
    },

    unwatch: function(docref, responseCallback, errorCallback) {
      var req = { Document: docref };
      delete this.watchedDocuments[docref];
      this.doPost("/document/shared/unwatch",
        req, responseCallback, errorCallback);
    },

    doGet: function(path, successCallback, errorCallback) {
		$.ajax({
	        url: TwoPlus.scope.host + path,
	        type: 'get',
			headers: {"Authorization" : TwoPlus.scope.accessToken },
			dataType: "json",
	        success: successCallback,
	        error: errorCallback,
     	});
    },

    doPost: function(path, data, successCallback, errorCallback) {
		$.ajax({
	        url: TwoPlus.scope.host + path,
	        type: 'post',
	        data: JSON.stringify(data),
			headers: {"Authorization" : TwoPlus.scope.accessToken },
			dataType: "json",
			contentType: "application/json; charset=utf-8",
	        success: successCallback,
	        error: errorCallback,
     	});
    }
});


function DDX_DocumentUpdated(docref) {
  var cb = TwoPlus.document.watchedDocuments[docref];
  if (typeof cb != 'undefined') {
  	cb(docref);
  }
}

if (TwoPlus.isInstalled(true)) {
	// custom WebView
	var instanceToken = TwoPlus.getParameterByName("instanceToken");

	// Basic API
	TwoPlus.exit = function() {
		ddx.send("Exit");
	}

	TwoPlus.setPasteboard = function(obj) {
		TwoPlus.scope.pasteboard = obj;
		ddx.send("Pasteboard", obj);
	}

	// load ddx
	var me = this;
	var imported = document.createElement('script');
	imported.src = 'http://127.0.0.1:2020/script/load/ddx.js';
	imported.onload = function() {
        ddx.instanceToken = instanceToken;
        TwoPlus.document = new DDXDocumentApi(ddx);
        ddx.ready();

        // DDX calls TwoPlusInit();
	};
	document.head.appendChild(imported);
} else if (TwoPlus.isInstalled()) {
	// iOS legacy WebView.
	
	TwoPlus.callIOS = function(url) {
		setTimeout(function() {
			  var iframe = document.createElement("IFRAME");
			  iframe.setAttribute("src", url);
			  document.documentElement.appendChild(iframe);
			  iframe.parentNode.removeChild(iframe);
			  iframe = null;
			},0);
	}
	
	TwoPlus.exit = function() {
		TwoPlus.callIOS("twoplus://exit");
	};
	
	TwoPlus.setPasteboard = function(obj) {
		TwoPlus.callIOS("twoplus://pasteboard/" + Base64.encode(JSON.stringify(obj)));
	};

	TwoPlus.document = new IOSLegacyDocumentApi();

	// ios calls __init
} else {
	// pure-web
	if (typeof YeouijuClient == 'object') {
		TwoPlus.document = YeouijuClient.getInstance().document;
	}

	// everything is loaded.
	// TODO: yeouiju.js auto-loading?
	// TODO: feed and identity scope
	// TODO: requires user to call us in something like $.ready().
	TwoPlusInit({});
}