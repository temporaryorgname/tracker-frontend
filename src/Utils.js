export const formatDate = function(inputDate) {
  if (typeof(inputDate) === 'string') {
    return inputDate;
  }
	let year = inputDate.getFullYear();
	let month = inputDate.getMonth()+1;
	if (month < 10) {
		month = '0'+month;
	}
	let date = inputDate.getDate();
	if (date < 10) {
		date = '0'+date;
	}
  var dateString = year+"-"+month+"-"+date; // Need to rebuild it to get rid of time zone funniness
  return dateString;
}

export const parseQueryString = function(query) {
  if (query.length <= 1) {
    return {};
  }
  if (query[0] === '?') {
    query = query.substr(1);
  }
  return query.split('&')
    .reduce(function(acc, x) {
      var tokens = x.split('=');
      if (tokens.length === 2) {
        acc[tokens[0]] = tokens[1];
      }
      return acc;
    }, {});
}

export const dictToQueryString = function(query) {
  var output = [];
  for (var k in query) {
    if (query.hasOwnProperty(k)) {
      output.push([k,query[k]].join('='))
    }
  }
  return '?'+output.join('&');
}

export const stringifyPolygon = function(polygon) {
  console.log('Stringifying');
  console.log(polygon);
  if (typeof polygon === 'undefined' || polygon === null) {
    return null;
  }
  return JSON.stringify(polygon)
          .split('[').join('(')
          .split(']').join(')');
}

export const parsePolygon = function(polygon) {
  if (typeof polygon !== 'string') {
    return [];
  }
  return JSON.parse(
    polygon.split('(').join('[')
           .split(')').join(']')
  );
}

export const stringifyBox = function(box) {
  if (typeof box === 'undefined' || box === null) {
    return null;
  }
  return JSON.stringify(box)
          .split('[').join('(')
          .split(']').join(')');
}

export const parseBox = function(box) {
  if (typeof box !== 'string') {
    return null;
  }
  // Boxes are formatted as '(x,y),(x,y)', so we need to add brakets around that
  return JSON.parse(
    '['+box.split('(').join('[')
           .split(')').join(']')+']'
  );
}

class StatusTreeNode {
  constructor(key, children) {
    this.key = key;
    this.children = children;
  }
}
export function getLoadingStatus(tree, filters, keysToCheck=null) {
	keysToCheck = keysToCheck || new Set(Object.keys(filters));
  if (tree && !(tree instanceof StatusTreeNode)) {
    return tree;
  }
  if (typeof tree === 'undefined' || keysToCheck.size === 0) {
    return null;
  }

  if (!keysToCheck.has(tree.key)) {
    return getLoadingStatus(tree.children[null], filters, keysToCheck);
  } else {
    keysToCheck = new Set(keysToCheck);
    keysToCheck.delete(tree.key);
    return getLoadingStatus(tree.children[filters[tree.key]], filters, keysToCheck) || getLoadingStatus(tree.children[null], filters, keysToCheck);
  }
}
export function updateLoadingStatus(tree, filters, status, keysToCheck=null) {
	keysToCheck = keysToCheck || new Set(Object.keys(filters));
  if (keysToCheck.size === 0) {
    return status;
  }
  if (tree && !(tree instanceof StatusTreeNode)) {
    return tree;
  }
  if (!tree) { // null or undefined tree
    let key = keysToCheck.values().next().value;
    keysToCheck = new Set(keysToCheck);
    keysToCheck.delete(key);
    return new StatusTreeNode(
      key,
      {
        [filters[key]]: updateLoadingStatus(
          null, filters, status, keysToCheck
        )
      }
    );
  }
  if (!keysToCheck.has(tree.key)) {
    return new StatusTreeNode(
      tree.key,
      {
        ...tree.children,
        [null]: updateLoadingStatus(tree[null], filters, status, keysToCheck)
      }
    );
  } else {
    keysToCheck = new Set(keysToCheck);
    keysToCheck.delete(tree.key);
    return new StatusTreeNode(
      tree.key,
      {
        ...tree.children,
        [filters[tree.key]]: updateLoadingStatus(
          null, filters, status, keysToCheck
        )
      }
    );
  }
}
