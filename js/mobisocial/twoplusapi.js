//////////////////////////////
///// Framework Code ///////
//////////////////////////////

var documentApi;
var myDoc;
var myDocId;

function watchDocument(docref, OnUpdate) {
  documentApi.watch(docref, function(updatedDocRef) {
    if (docref != myDocId) {
      console.log("Wrong document!!");
    } else {
      documentApi.get(docref, OnUpdate);
    }
  }, function(result) {
    var timestamp = result.Expires;
    var expires = timestamp - new Date().getTime();
    var timeout = 0.8 * expires;
    setTimeout(function() {
      watchDocument(docref, OnUpdate);
    }, timeout);
  }, Anagrammer.Error);
}

function initDocument() {
  if (TwoPlus.isInstalled()) {
    documentApi = TwoPlus.document;
    _loadDocument();
  } else {
    var yjclient = YeouijuClient.getInstance();
    yjclient.setPipelineProcessors();
    documentApi = yjclient.document;
    yjclient.ensureRegistration(function() {
      yjclient.syncRealtime();
      _loadDocument();
    }, Anagrammer.Error);
  }
}

function hasDocument() {
  var docIdParam = window.location.hash.indexOf("/docId/");
  return (docIdParam != -1);
}

function getDocumentReference() {
  var docIdParam = window.location.hash.indexOf("/docId/");
  if (docIdParam == -1) return false;
  var docId = window.location.hash.substring(docIdParam+7);
    var end = docId.indexOf("/");
    if (end != -1) {
      docId = docId.substring(0, end);
    }
    return docId;
}

function _loadDocument() {
  if (hasDocument()) {
    myDocId = getDocumentReference();
    documentApi.get(myDocId, Anagrammer.ReceiveUpdate);
    watchDocument(myDocId, Anagrammer.ReceiveUpdate);
  } else {
    documentApi.create(function(d) {
      myDocId = d.Document;
      location.hash = "#/docId/" + myDocId;
      documentApi.update(myDocId, Anagrammer.Replace, Anagrammer.InitialDocument(), function() {
        documentApi.get(myDocId, Anagrammer.DocumentCreated);
      });
      watchDocument(myDocId, Anagrammer.ReceiveUpdate);
    }, function(e) {
      alert("error" + e);
    });
  }
}