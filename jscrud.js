		
function Jscrud(selectedStorageEngine, protectedNameSpace){
	// Create, Read, Update, Delete methods will have to be supported
	// as items are created they will first have to be indexed

	var holder = {};
	var indices = {};

	var nameSpace = protectedNameSpace || "jscrud" + Math.floor(Math.random()*1000000);

	var engines = {
		'localStorage': window.localStorage,
		'sessionStorage': window.sessionStorage
	};


	var storageEngine =  ( engines[selectedStorageEngine] || window.sessionStorage );


	var nameSpacer = function(name, nameSpace){
		return nameSpace + ":" + name
	}

	var storeObject = function(item){
		// store item as a JSON string inside the localStorage engine

		var key = nameSpacer(item.__uid, nameSpace);
		var value = JSON.stringify(item);

		storageEngine.setItem(key, value);
		return undefined
	}

	var retrieveObject = function(uid){
		var key = nameSpacer(uid, nameSpace);
		var value = JSON.parse(storageEngine.getItem(key));
		return value
	}

	var indexObject = function(item){
		for (key in item){
			if (!(key in indices)){
				// this is the first time the program has encountered this key, create an index in indices for it
				indices[key] = {};
			};

			// the index for each key now definitely exists
			var indx = indices[key];
			var value=item[key];

			var uid = item['__uid'];

			if (value in indx){
				// the name is already in the index, add item's uid to index array
				indx[value].push(uid);
			} else {
				// this is the first time the name has been encountered, create a new array with this name by itself
				indx[value] = [uid];
			}	
		}
	};

	var publicForm = function(record){
		// remove the program-added uid for the user's copy of the record

		// safely clone our object so deleting attributes doesn't remove them for real
		var publicFormRecord = JSON.parse(JSON.stringify(record));

		delete publicFormRecord.__uid;
		return publicFormRecord;
	}


	var filterArrays = function(arrayList){
		// the shortest uid array passed in should be the source for all tested uids
		// by definition, any item in the intersection of all arrays must be in the shortest array
		// create an array to hold matched uids
		var matches = [];
		if (arrayList.length === 1){
			// if only one uid array was passed in, return it, we're done
			return arrayList[0];
		}
		// find the shortest array:
		var testArray = arrayList.sort(function(a,b){
			return a.length - b.length;
		})[0];
		testArray.forEach(function(uid){
			var matchFlag = true;
			arrayList.forEach(function(testAgainst){
				if (testAgainst.indexOf(uid)===-1){
					matchFlag = false;
				}
			})
			if (matchFlag === true){
				matches.push(uid);
			}
		})
		return matches;
	}


	var matchObject = function(item){
		var indxHits = [];
		for (key in item){
			var value = item[key];
			if (key in indices){
				// if there is an index defined for the matching object, push the uid's in the index array and into the indxHits array
				var indx = indices[key];
				var hit = indx[value];
				indxHits.push(hit);
			} else {
				// there is no index defined for some key in the matching object, therefore there is no match, return out of the loop
				return [];
			}
		}
		// test returned index hits; a uid must be present in all of them to be considered a match
		var matches = filterArrays(indxHits);
		// return the matched records
		return matches;
	}



	var stripIndices = function(uuids){
		// clear an item's old indices

		// return a new uids object we can edit without problematic side effects (they were being deleted somewhere else and throwing errors) 
		var uids = uuids.slice(0, uuids.length)
		uids.forEach(function(uid){
			var item = retrieveObject(uid);

			if (item == null) {
				return;
			}
			for (key in item){
				var currentIndex = indices[key];
				var entry = currentIndex[item[key]];

				// find the uid of the item to be cleared from index
				var removeIndex = entry.indexOf(uid);
				entry.splice(removeIndex, 1);
			}
		});
	}

	var updateIndices = function(oldItem, newItem){
		// strip out the old index entries
		stripIndices(matchObject(oldItem));
		// put in new ones!
		indexObject(newItem);
	}

	// not an actual uid but unique enough for our needs.
	var makeUid = function() {
		return parseInt((new Date()).getTime() + String(Math.floor(Math.random() * 100)));
	}

	var createRecord = function(item){
		var uid = makeUid();
		item['__uid'] = uid;
		// index the object
		indexObject(item);

		// store the object
		storeObject(item);

	};


	var readRecordInternal = function(item){
	// find and return a set of records with their uids, an internal method
		var uids = matchObject(item);

		return uids.map(function(uid){
			return retrieveObject(uid);
		});
	}

	var readRecord = function(item){
	// find and return a record
		var uids = matchObject(item);

		return uids.map(function(uid){
			return publicForm(retrieveObject(uid));
		});
	}

	var deleteRecord = function(item){
		var uids = matchObject(item);
		var uids2 = uids.slice(0, uids.length)

		stripIndices(uids);

		// clear an item's old indices
		uids2.forEach(function(uid){
			storageEngine.removeItem(nameSpacer(uid, nameSpace));
		});
	}


	var updateRecord = function(item, updates){
		// update record

		// find and retrieve an array of items that match the pattern of 'item'
		
		var original = readRecordInternal(item);
		
		original.forEach(function(record){

			var toClear = [record.__uid];

			stripIndices(toClear);
			for (key in updates){
				record[key] = updates[key];
			}
			indexObject(record);
			var key = nameSpacer(toClear[0], nameSpace);
			// overwrite the old record with the new one
			storeObject(record);
		
		})
		

		return undefined
	}


	this.readRecord = readRecord;
	this.createRecord = createRecord;
	this.deleteRecord = deleteRecord;
	this.updateRecord = updateRecord;
}


exports.Jscrud = Jscrud;
