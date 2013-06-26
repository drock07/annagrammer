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

/**
 * Abstraction for models that may eventually gain persistence.
 */
function Model() {
  this.data = {};
  this.get = function(attribute) {
    return this.data[attribute];
  };
  
  this.set = function(key, value) {
    var attrs;
    if (typeof key == "object") {
      attrs = key;
    } else {
      attrs = {};
      attrs[key] = value;
    }
    for (p in attrs) {
      this.data[p] = attrs[p];
    }
  };
  
  this.has = function(attr) {
    return this.get(attr) != null;
  };
};

var MessageProcessor = Class.extend(
  /** @lends MessageProcessor# */
  {
    
  /**
   * @constructs
   */
   construct: function() {},
    
  /**
   * Return the dependencies of a message to ensure ordered execution.
   */
  getDependencies: function(msg) {
    return null;
  },
  
  deliverMessage: function(msg) {
    return null;
  },
  
  deferMessage: function(msg) {},
  
  beginBatch: function() {},
  preBatchCommit: function() {},
  endBatch: function() {}
});


/**
 * Maps message types to different message processors.
 * @class
 * @augments MessageProcessor
 */
var TypedMessageProcessor = MessageProcessor.extend(
  /**
   * @lends TypedMessageProcessor.prototype
   */
  {

  typedProcessors: {},
  defaultProcessor: null,

  /**
   * @constructs
   * @param {MessageProcessor} defaultProcessor the processor to use if a message's type isn't registered.
   */
  construct: function(defaultProcessor) {
    this.defaultProcessor = defaultProcessor;
  },
  
  /**
   * Register a processor to handle an obj by type.
   * @param {String} type the type of message to handle
   * @param {MessageProcessor} processor the processor to handle messages of the given type.
   */
  add: function(type, processor) {
    this.typedProcessors[type] = processor;
  },
  
  getDependencies: function(msg) {
    var proc = this.typedProcessors[msg.Type];
    if (proc) {
      return proc.getDependencies(msg);
    } else if (this.defaultProcessor) {
      return this.defaultProcessor.getDependencies(msg);
    }
    return null;
  },
  
  deliverMessage: function(msg) {
    var proc = this.typedProcessors[msg.Type];
    if (proc) {
      return proc.deliverMessage(msg);
    } else if (this.defaultProcessor) {
      return this.defaultProcessor.deliverMessage(msg);
    }
    return null;
  },
  
  deferMessage: function(msg) {
    var proc = this.typedProcessors[msg.Type];
    if (proc) {
      proc.deferMessage(msg);
    } else if (this.defaultProcessor) {
      this.defaultProcessor.deferMessage(msg);
    }
  },
  
  beginBatch: function() {
    for (var type in this.typedProcessors) {
      this.typedProcessors[type].beginBatch();
    }
    if (this.defaultProcessor) {
      this.defaultProcessor.beginBatch();
    }
  },
  
  preBatchCommit: function() {
    for (var type in this.typedProcessors) {
      this.typedProcessors[type].preBatchCommit();
    }
    if (this.defaultProcessor) {
      this.defaultProcessor.preBatchCommit();
    }
  },
  
  endBatch: function() {
    for (var type in this.typedProcessors) {
      this.typedProcessors[type].endBatch();
    }
    if (this.defaultProcessor) {
      this.defaultProcessor.endBatch();
    }
  }
});

var YeouijuBlobStorage = Class.extend(
  /**
   * Purely in-memory implementation.
   */
  {
  blobSources: new Model(),

  construct: function() {},
  
  addBlobSource: function(hash, length, source) {
    var sources = this.blobSources.get(hash);
    if (!sources) sources = new Array();
    sources.push(source);
    this.blobSources.set(hash, sources);
  },

  getBlobSources: function(hash) {
    var srcs = this.blobSources.get(hash);
    if (srcs == null) srcs = new Array();
    return srcs;
  },
});


/**
 * YeouijuClient class
 */
var YeouijuClient = Class.extend(
  /** @lends YeouijuClient# */
  {

  UrlBase: "https://2plusapp.com",
  DBG: true,
  MAX_PAGE_REQUESTS: 3,

  
  _instance: null,
  _pagesBeingSynced: 0,
  _pendingPages: new Array(),

  _blobStorage: new YeouijuBlobStorage(),
  _pendingBlobRequests: {},

  _persistentProcessor: null,
  _realtimeProcessor: null,

  /**
   * @constructs
   */
  construct: function() {
    this.document = new YJDocumentApi(this);
  },

  /**
   * Executes an authenticated http POST against the server.
   * @param api the server endpoint
   * @param data the JSON data to post to the server
   * @param [callback] a callback executed after the call returns
   * @param [errorCallback] a function executed after a failed call
   */
  post: function(api, data, callback, errorCallback) {
    $.ajax({
      type: 'POST',
      url: this.UrlBase + api,
      data: JSON.stringify(data),
      success: callback,
      beforeSend: function(xhr) {
          var deviceToken = sessionStorage["DeviceToken"];//$.cookie("DeviceToken");
        if (deviceToken)
          xhr.setRequestHeader('Authorization', 'YJ0 ' + deviceToken);
      },
      error: function(e) {
        console.info(e);
        if(errorCallback) {
          errorCallback(e);
        }
      },
      dataType: "json",
      contentType: "application/json; charset=utf-8",
    });
  },
  
  /**
   * Executes an authenticated http GET against the server.
   * @param api the server endpoint
   * @param [callback] a callback executed after the call returns
   * @param [errorCallback] a function executed after a failed call
   */
  get: function(api, callback, errorCallback) {
    $.ajax({
      type: 'GET',
      url: this.UrlBase + api,
      beforeSend: function(xhr) {
          var deviceToken = sessionStorage["DeviceToken"]; //$.cookie("DeviceToken");
        if (deviceToken)
          xhr.setRequestHeader('Authorization', 'YJ0 ' + deviceToken);
      },
      success: callback,
      error: function(e) {
        console.info(e);
        if(errorCallback) {
          errorCallback(e);
        }
      },
      dataType: "json",
      contentType: "application/json; charset=utf-8",
    });
  },
  
  mainIdentity: function() { return this.identities ? this.identities[0] : null },
  
  /**
   * Persist a message to a feed.
   * @param msg the message to persist to the server.
   * @param msg.Sender the sender's principal (id)
   * @param msg.Feed the feed identifier
   * @param msg.Type the type of the message
   * @param msg.Message base64-encoded message contents
   */
  persist: function(msg, callback, errorCallback) {
    this.post("/a/api/0/persist", msg, callback, errorCallback);
  },
  
  blobReferenceForHash: function(hash) {
    var urls = this._blobStorage.getBlobSources(hash);
    if (urls.length == 0) return null;
    return { Hash: hash, Brl: urls[0] };
  },

  fetchBlobWithHash: function(requester, hash, callback, errorCallback) {
    var urls = this._blobStorage.getBlobSources(hash);
    if (urls.length == 0) {
      var pending = this._pendingBlobRequests[hash];
      if (!pending) pending = new Array();
      pending.push({ "r" : requester, "c" : callback, "e" : errorCallback });
      this._pendingBlobRequests[hash] = pending;
      return;
    }
    var hosted = { Hash: hash, Brl: urls[0] };
    var request = { Requester: requester, HostedBlob: hosted };
    this.post("/a/api/0/blob/href/get", request, function(ticket) {
      callback(ticket.Url);
    }, errorCallback);
  },
  
  _startDataSync: function() {
    if(!this.syncRunning) {
      var me = this;
      me.syncRunning = true;
      me.resetRealtime(function() {
        me.syncIdentityFeeds();
      });
    } else {
      console.warn("Data sync already running.");
    }
  },
  
  syncFeed: function(feed, since, success) {
    var me = this;

    var pageListRequest = { Since: since, ChangeKey: 0, Feed: feed };
      pageListRequest.Requester = this.mainIdentity();
      this.post("/a/api/0/since", pageListRequest, function(pageList) {
        //yjstate.feedStates[identity] = pageList.Latest;
        if (pageList.PageList.length > 0) {
          for (i = 0; i < pageList.PageList.length; i++) {
            var page = pageList.PageList[i];
            var pageState = { Page: page, Feed: feed, Start: 0, ChangeKey: 0 };
            me._pendingPages.push(pageState);
          }
          me._onPagesAvailable();
        }
        
        if (typeof success == "function") {
          success();
        }
      });
  },
  
  syncIdentityFeeds: function() {
    var me = this;
    for (var identity in yjstate.identityStates) {
      var pageListRequest = yjstate.identityStates[identity];
      pageListRequest.Requester = identity;
      this.post("/a/api/0/since", pageListRequest, function(pageList) {
        yjstate.identityStates[identity] = pageList.Latest;
        if (pageList.PageList.length > 0) {
          for (i = 0; i < pageList.PageList.length; i++) {
            var page = pageList.PageList[i];
            var pageState = { Page: page, Feed: pageList.Feed, Start: 0, ChangeKey: 0 };
            me._pendingPages.push(pageState);
          }
          me._onPagesAvailable();
        }       
      });
    }
  },
  
  _onPagesAvailable: function() {
    var me = this;

    while (me._pagesBeingSynced < me.MAX_PAGE_REQUESTS && me._pendingPages.length > 0) {
      me._pagesBeingSynced++;
      var page = me._pendingPages.shift();
      this.post("/a/api/0/asyncfetch", page, function() {
        console.info("asyncfetch complete");
      }, function() {
        console.info("no syncy");
      });
    }
  },
  
  resetRealtime: function(callback) {
    var me = this;
    this.get("/a/api/0/reset", function(d) {
      if (me.DBG) console.info("Reset realtime.");
      me._consumeRealtime();
      if (typeof callback == "function") {
         callback();
      }
    }, function(e) {
      console.info("Error during realtime sync: " + e);
      me.syncRunning = false;
      window.setTimeout(function() { this.resetRealtime(callback); }, 1000);
    });
  },
  
  _decodeMessage: function(obj) {
    obj.Message = Base64.decode(obj.Message);
    try {
      obj.Message = JSON.parse(obj.Message);
    } catch (e) {}
    return obj;
  },
  
  _consumeRealtime: function(streamState) {
    var me = this;
    if (!streamState) {
      streamState = { Connection: 0 };
    }
    this.post("/a/api/0/consume", streamState, function(persistedObjectStream) {
      if (!persistedObjectStream) {
        window.setTimeout(function() {
          me._consumeRealtime(streamState);
        }, 0);
        return;
      }

      var persistentProcessor = me._persistentProcessor;
      if (!persistentProcessor) persistentProcessor = me._doNothingProcessor();
      var realtimeProcessor = me._realtimeProcessor;
      if (!realtimeProcessor) realtimeProcessor = me._doNothingProcessor();

      var seenPersistent = false, seenRealtime = false;
      for (var i in persistedObjectStream.Objects) {
        var obj = me._decodeMessage(persistedObjectStream.Objects[i]);
        if (obj.Page) {
          if (!seenPersistent) {
            persistentProcessor.beginBatch();
            seenPersistent = true;
          }
          var dependencies = persistentProcessor.getDependencies(obj);
          if (dependencies != null && dependencies.length > 0) {
            // TODO: store as deferred
            persistentProcessor.deferMessage(obj);
          } else {
            persistentProcessor.deliverMessage(obj);
          }
        } else {
          if (!seenRealtime) {
            realtimeProcessor.beginBatch();
            seenRealtime = true;
          }
          realtimeProcessor.deliverMessage(obj);
        }
      }
      
      if (seenPersistent) {
        persistentProcessor.preBatchCommit();
        persistentProcessor.endBatch();
      }
      if (seenRealtime) {
        realtimeProcessor.endBatch();
      }

      streamState.AckKey = persistedObjectStream.AckKey;
      window.setTimeout(function() {
        me._consumeRealtime(streamState);
      }, 0);
    }, function(e) {
      console.info("realtime sync failed: " + e);
      window.setTimeout(resetRealtime, 1000);
    });
  },

  _pageRequestCompleteProcessor: function() {
    var yj = this;
    var prcp = MessageProcessor.extend({
      deliverMessage: function(msg) {
        yj._pagesBeingSynced--;
        if (yj._pagesBeingSynced == 0 && yj._pendingPages.length == 0) {
          if (typeof yj._initialDataLoadedCallback == "function") {
            yj._initialDataLoadedCallback();
          }
        }
        yj._onPagesAvailable();
      }
    });
    return new prcp();
  },
  
  _feedPageProcessor: function() {
    var yj = this;
    var fpp = MessageProcessor.extend({
      deliverMessage: function(msg) {
        pobj = msg.Message;
        var pageState = { Page: pobj.Page, Feed: pobj.Feed, Start: 0, ChangeKey: 0 };
        yj._pendingPages.push(pageState);
        yj._onPagesAvailable();
      }
    });
    return new fpp();
  },
  
  _blobRefProcessor: function() {
    var yj = this;
    var brp = MessageProcessor.extend({
      deliverMessage: function(msg) {
        var ref = msg.Message;
        yj._blobStorage.addBlobSource(ref.Hash, ref.Length, ref.Source);
        
        var pending = yj._pendingBlobRequests[ref.Hash];
        if (pending) {
          for (var i = 0; i < pending.length; i++) {
            yj.fetchBlobWithHash(pending[i]["r"], ref.Hash, pending[i]["c"], pending[i]["e"]);
          }
          delete yj._pendingBlobRequests[ref.Hash];
        }
      }
    });
    return new brp();
  },
  
  _doNothingProcessor: function() {
    var dnp = MessageProcessor.extend({});
    return new dnp();
  },
  
  /**
   * Ensures that the browser session has a valid device token.
   * @returns {void}
   */
  ensureRegistration: function(callback, errorCallback, forceReset) {
    var me = this;
    if (forceReset) {
      sessionStorage.removeItem("DeviceToken");
      //$.cookie("DeviceToken", null, { path : "/" });
      //$.cookie("SecondaryDeviceToken", null);
    }

    var registration = {
      "ClientVersion" : "0;web;"
    };

    $.ajax({
      url : this.UrlBase + "/a/api/0/register?__nocache=" + $.now(),
      type : "POST",
      data : JSON.stringify(registration),
      dataType : "json",
      contentType : "application/json; charset=utf-8",
      beforeSend: function(xhr) {
        var deviceToken = sessionStorage["DeviceToken"]; //$.cookie("DeviceToken");
        if (deviceToken)
          xhr.setRequestHeader('Authorization', 'YJ0 ' + deviceToken);
      },
      success : function(data) {
        sessionStorage["DeviceToken"] = data.DeviceToken;
        me.identities = data.OwnedIdentities;
        me.appRedirect = data["AppRedirectUrl"];
        if (typeof (callback) == "function") {
          callback(data);
        }
      },
      error : function(jqXHR, textStatus, errorThrown) {
        if (!forceReset) {
          console.info("Service has been reset, refreshing.");
          me.ensureRegistration(callback, errorCallback, true);
        } else {
          if (typeof (errorCallback) == "function") {
            errorCallback(textStatus);
          }
        }
      }
    });
  },

  /**
   * Returns the redirect url used to return to an app tied to this client.
   * Client must be registered.
   */
  getAppRedirect: function() {
    return this.appRedirect;
  },

  /**
   * Populates the feed with owned identities, issues a "since" against default feed
   * @Deprecated, see syncIdentityList, syncFeedList, syncAllData.
   */
  init: function() {
    var me = this;
    this.get("/a/api/0/owned", function(d) {
      if (d.Identities.length == 0) {
         console.warn("No identities linked to client.");
         return;
      }

      me.identities = new Array();
      me.identityDetails = {};
      for (i = 0; i < d.Identities.length; i++) {
        var ident = d.Identities[i].Identity;
        if (me.DBG) console.info("added identity " + ident);
        yjstate.identityStates[ident] = { Since: 0, ChangeKey: null };
        me.identities.push(ident);
        me.identityDetails[ident] = d.Identities[i];
      }
      me._startDataSync();
    });
  },
  
  syncIdentityList: function(success) {
    var me = this;
    this.get("/a/api/0/owned", function(d) {
      me.identities = new Array();
      me.identityDetails = {};

      for (i = 0; i < d.Identities.length; i++) {
        var ident = d.Identities[i].Identity;
        if (me.DBG) console.info("added identity " + ident);
        yjstate.identityStates[ident] = { Since: 0, ChangeKey: null };
        me.identities.push(ident);
        me.identityDetails[ident] = d.Identities[i];
      }
      me._startDataSync();
      if (typeof success == "function") {
         success();
      }
    });
  },
  
  syncAllData: function() {
    this.init();
  },

  syncRealtime: function() {
    if (typeof yjstate == 'undefined') {
      yjstate = { identityStates: [] };
    }
    this._startDataSync();
  },
  
  syncFeedList: function() {
    var me = this;
    this.get("/a/api/0/owned", function(d) {
      if (d.Identities.length == 0) {
         console.warn("No identities linked to client.");
         return;
      }

      me.identities = new Array();
      me.identityDetails = {};
      for (i = 0; i < d.Identities.length; i++) {
        var ident = d.Identities[i].Identity;
        if (me.DBG) console.info("added identity " + ident);
        me.identities.push(ident);
        me.identityDetails[ident] = d.Identities[i];
      }
      me._startDataSync();

      me.post("/a/api/0/details/list", null, function(detailsList) {
        // TODO: the server should send :feed_details directly over asyncfetch.
        var proc = me._persistentProcessor;
        proc.beginBatch();
        for (var i = 0; i < detailsList.Details.length; i++) {
          var deets = detailsList.Details[i];
          var about = { name: deets.Name, };
          var obj = { Type: ":feed_details", Feed: deets.Feed, Message: about };
          proc.deliverMessage(obj);
        }
        proc.endBatch();
        
        if (typeof me._initialDataLoadedCallback == "function") {
            me._initialDataLoadedCallback();
        }
      });
      // mark dataSync as being enabled,
      // create feed with _sync = false, set to _sync = 0 once synced
      // while issuing a feed sync request
    });
  },
  
  setInitialDataLoadedCallback: function(callback) {
    this._initialDataLoadedCallback = callback;
  },
  
  setPipelineProcessors: function(persistent, realtime) {
    var proc = new TypedMessageProcessor(persistent);
    proc.add(":page", this._feedPageProcessor());
    proc.add(":deleted", this._doNothingProcessor());
    proc.add(":end", this._doNothingProcessor());
    proc.add(":io", this._pageRequestCompleteProcessor());
    //proc.add(":contact", new YJContactProcessor());
    proc.add("ref", this._blobRefProcessor());
    this._persistentProcessor = proc;
    
    proc = new TypedMessageProcessor(realtime);
    this._realtimeProcessor = proc;
  },

  document: false, // new YJDocumentApi()
  
});

YeouijuClient.getInstance = function() {
  if (this._instance == null) {
    this._instance = new YeouijuClient();
  }
  return this._instance;
};

/**
 * YJContactProcessor class
 */
var YJContactProcessor = MessageProcessor.extend({
  contacts: {},

  deliverMessage: function(msg) {
    var c = msg.Message;
    this.contacts[c.identity] = c.name;
  },

});

/**
 * Document API
 */
var YJDocumentApi = Class.extend(
  /** @lends YJDocumentApi# */
  {

    yjclient: false, // will hold a YeouijuClient instance
    watchingDocuments: false,
    watchedDocuments: {},

    /**
     * @constructs
     */
    construct: function(yjclient) {
      this.yjclient = yjclient;
    },

    create: function(success, error) {
      this.yjclient.get("/a/api/0/document/create", success, error);
    },

    get: function(docref, callback, error) {
      var doc = { Document: docref };
      this.yjclient.post("/a/api/0/document/shared/get", doc, callback, error); 
    },

    update: function(docref, func, params, callback, error) {
      var req = { "Document" : docref,
                  "Command" : func.toString(), 
                  "Parameters" : JSON.stringify(params),
                };
      this.yjclient.post("/a/api/0/document/shared/update", req, callback, error);
    },

    watch: function(docref, updateCallback, responseCallback, errorCallback) {
      if (!this.watchingDocuments) {
        this.yjclient._realtimeProcessor.add(":docUpdated", this._documentUpdatedCallback());
        this.watchingDocuments = true;
      }

      var req = { "Document" : docref };
      this.watchedDocuments[docref] = updateCallback;
      this.yjclient.post("/a/api/0/document/shared/watch", req, function(response) {
        responseCallback(response);
      }, function(error) {
        delete this.watchedDocuments[docref];
        errorCallback(error);
      });
    },

    unwatch: function(docref, responseCallback, errorCallback) {
      var req = { Document: docref };
      delete this.watchedDocuments[docref];
      this.yjclient.post("/a/api/0/document/shared/unwatch",
        req, responseCallback, errorCallback);
    },

    _documentUpdatedCallback: function() {
        var docApi = this;
        var duc = MessageProcessor.extend({
          deliverMessage: function(msg) {
            var docref = msg.Feed;
            var cb = docApi.watchedDocuments[docref];
            if (typeof cb == 'function') {
              cb(docref);
            }
          }
        });
        return new duc();
    },
});

function supports_html5_storage() {
  try {
    return 'sessionStorage' in window && window['sessionStorage'] !== null;
  } catch (e) {
    return false;
  }
}