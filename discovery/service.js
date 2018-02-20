'use strict';

const es = require('../config/index');
const config = require('../config/config');
const request  = require("request");
const Repository = require('../libs/repository');
const FedoraRepository = require('../libs/repository.fedora');
const Helper = require("./helper");


// Create thumbnail links
var createItemList= function(items) {
  var itemList = [], tn, pid, title, description, display;
  for(var item of items) {
      
    // 
    if(item.title && item.title != "") {
      title = item.title;
      description = item.description || "";
    }
    else if(item.display_record && typeof item.display_record == 'string') {
        try {
          display = JSON.parse(item.display_record);
        }
        catch(e) {
          console.log("Error: invalid display record JSON on object: " + item.pid);
          continue;
        }

        title = display.title || "";
        description = display.description || display.abstract || "";
    }
    else {
      title = "";
      description = "";
    }
      
    // This is a list of communities
    if(item.pid) {
      // tn = Repository.getCollectionTN(item.pid);
      tn = Repository.getObjectTN(item.pid);
      pid = item.pid
    }
    // This is a list of objects
    else if(item.mime_type) {
      tn = Repository.getObjectTN(item.pid);
      pid = item.pid
    }
    // This is a list of collections
    else {
      tn = Repository.getCommunityTN(item.id);
      pid = item.id
    }

    itemList.push({
        pid: pid,
        tn: tn,
        title: title,
        description: description
      });
  }
  return itemList;
}

var addTNData = function(resultArray) {
  // Foreach in array, add new prop 'tn'
  var tn = "";
  resultArray.forEach(function(result) {
    console.log("Result:",result);
  });
}

exports.getTopLevelCollections = function(callback) {
  Repository.getCommunities().catch(error => {
    callback({status: false, message: error, data: null});
  })
  .then( response => {
      if(response) {
        var list = createItemList(JSON.parse(response));
        callback({status: true, data: list});
      }
  });
}

exports.getCollectionsInCommunity = function(communityID, callback) {
  Repository.getCollections(communityID).catch(error => {
    callback({status: false, message: error, data: null});
  })
  .then( response => {
      if(response) {
        var list = createItemList(JSON.parse(response));
        callback({status: true, data: list});
      }
  });
}

exports.getObjectsInCollection = function(collectionID, callback) {
  Repository.getCollectionObjects(collectionID).catch(error => {
    callback({status: false, message: error, data: null});
  })
  .then( response => {
      if(response) {
        var list = createItemList(JSON.parse(response));
        callback({status: true, data: list});
      }
  });
}

exports.searchIndex = function(query, type, facets=null, page=null, callback) {

    // Build elasticsearch matchfields object for query: this object enables field specific searching
    var field = { match: "" };
    var matchFields = [], results = [];

      console.log("TEST SEARCH: query in:", query);

    // Type specific search (if a searchfield is selected)
    if(Array.isArray(type)) {
        //query = "*" + query + "*";
        type.forEach(function(type) {
          var q = {};
          q[type] = query;
          matchFields.push({
              "match": q
          });
        })
    }

    // Search all fields (searchfield == All)
    else {

        var q = {};
        q[type] = query;
        matchFields.push({
          "match": q
        });
    }

    // If facet data is present, add it to the search
    // TODO create the array to add to "must" key below
    if(facets) {
      // var matchFacetFields = [], indexKey, count=0;
      // for(var key in facets) {
      //   for(var index of facets[key]) {
      //     var q = {};
      //     count++;

      //     // Get the index key from the config facet list, using the facet name 
      //     indexKey = config.facets[key];

      //     // Add to the main ES query object
      //     q[indexKey] = index;
      //     matchFields.push({
      //       "match": q
      //     });
      //   }
      // }
      console.log("Facets in:", facets);
    }

      console.log("TEST SEARCH: matchfields generated:", matchFields);

    // Build elasticsearch aggregations object from config facet list
    var facetAggregations = {}, field;
    for(var key in config.facets) {
      field = {};
      field['field'] = config.facets[key] + ".keyword";
      facetAggregations[key] = {
        "terms": field
      };
    }

    // Elasticsearch query object
    var data = {  
      index: config.elasticsearchIndex,
      type: 'data',
      body: {
        from : 0, 
        size : config.maxDisplayResults,
        query: {
            "bool": {
              "should": matchFields,
              "must": [{ "match_phrase": { "subject": "Athletics,College sports,Men's basketball,Basketball" }},{ "match_phrase": { "creator": "Wildt, James W." }}]
            }
        },
        aggregations: facetAggregations
      }
    }

    // if(facets) {
    //   //data.body.query.bool["minimum_should_match"] = count+1;
    //   data.body.query.bool["must"] = facets;
    // }

      console.log("TEST SEARCH: search data object:", data.body.query.bool);

    // Query the index
    es.search(data, function (error, response, status) {
      var responseData = {};
      if (error){
          console.log("TEST SEARCH: search error:", error);
        callback({status: false, message: error, data: null});
      }
      else {
      
        // Return the aggs for the facet display
        responseData['facets'] = response.aggregations;

        try {
          // Build the search results objects
          var results = [], tn, resultData;
          for(var result of response.hits.hits) {

            tn = FedoraRepository.getDatastreamUrl("tn", result._source.pid.replace('_', ':'));

            // Get the title and description data for the result listing
            resultData = Helper.getSearchResultDisplayFields(result);

            // Push a new result object to the results array
            results.push({
              title: resultData.title || "",
              namePersonal: result._source.namePersonal,
              abstract: resultData.description || "",
              tn: tn,
              pid: result._source.pid
            });
          }
          responseData['results'] = results;

          callback({status: true, data: responseData});
        }
        catch (e) {
          callback({status: false, message: e, data: responseData});
        }
      }
  });
}

exports.fetchObjectByPid = function(pid, callback) {
  var objectData = {
    pid: null
  };
  
  // Remove prefix for index id
  pid = pid.replace(config.institutionPrefix + "_", "");
  pid = pid.replace(config.institutionPrefix + ":", "");
  es.get({
      index: config.elasticsearchIndex,
      type: "data",
      id: pid
  }, function (error, response) {

      if(error) {
        callback({status: false, message: error, data: null});
      }
      else if(response.found) {
        objectData = response._source;
        callback({status: true, data: objectData});
      }
      else {
        callback({status: true, data: objectData});
      }
  });
}

exports.getFacets = function (callback) {

    // Build elasticsearch aggregations object from config facet list
    var aggs = {}, field;
    for(var key in config.facets) {
      field = {};
      field['field'] = config.facets[key] + ".keyword";
      aggs[key] = {
        terms: field
      };
    }
    es.search({
        body: {
            "size": 0,
            "query": {
                "match_all": {}
            },
            "aggregations": aggs
        }
    }).then(function (body) {
        callback(body.aggregations);
    }, function (error) {
        callback(error);
    });
};

exports.searchFacets = function (query, facets, page, callback) {

    client.search({
            body: {
                "query": {
                    "bool": {
                        "must": {
                            "multi_match": {
                                "operator": "and",
                                "fields": facets,
                                "query": query // q
                            }
                        }
                    }
                }
            }
        }
    ).then(function (body) {
          console.log("TEST FSEARCH: search facets results:", body);
        callback(body);
    }, function (error) {
        callback(error);
    });
};