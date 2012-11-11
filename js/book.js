var element = function(id) { return document.getElementById(id); }
var errorMessage = undefined;

function getOpenDatabase() {
    try {
        if( !! window.openDatabase ) return window.openDatabase;
        else return undefined;
    } catch(e) {
        return undefined;
    }
}

function dispError( message ) {
    errorMessage = '<p class="error">' + message + '</p>';
    haveError = true;
}


function table( wrap ) {
    this.wrap = ( wrap == undefined ) ? true : wrap;    // default to true
    this.rows = new Array();
    this.header = [];

    this.setHeader = function( row ) {
        this.header = row;
    }

    this.addRow = function( row ) {
        this.rows.push(row);
    }

    this.getRow = function ( index ) {
        return this.rows[index];
    }

    this.getTableHTML = function () {
        var a = '';
        if(this.wrap) a += '<table class="table table-striped ">\n';
        a += this.getHeaderHTML();
        for(var row in this.rows) {
            a += this.getRowHTML(this.rows[row]);
        }
        if(this.wrap) a += '</table>\n';
        return a;
    }

    this.getHeaderHTML = function () {
        if( this.header.length == 0 ) return '';
        var a = '<tr>';
        for( var cell in this.header ) {
            a += '<th>' + this.header[cell] + '</th>';
        }
        a += '</tr>\n';
        return a;
    }

    this.getRowHTML = function (row ) { 
        var a = '<tr>';
        for( var cell in row ) {
            var v= row[cell];
            if(v == null) v = '<span class="red">NULL</span>';
            a += '<td>' + v + '</td>';
        }
        a += '</tr>\n';
        return a;    
    }

    this.writeTable = function () {
        document.write(this.getTableHTML());
    }



}

var db = prepareDatabase();
var createSQL = 'CREATE TABLE IF NOT EXISTS Contacts (' +
        'id INTEGER PRIMARY KEY,' +
        'lastname TEXT,' +                  
        'firstname TEXT,' +
        'email TEXT' +
    ')';

// Check if this browser supports Web SQL
function getOpenDatabase() {
    try {
        if( !! window.openDatabase ) return window.openDatabase;
        else return undefined;
    } catch(e) {
        return undefined;
    }
}

// Open the Web SQL database
function prepareDatabase() {
    var odb = getOpenDatabase();
    if(!odb) {
        dispError('Web SQL Not Supported');
        return undefined;
    } else {
        var db = odb( 'contDatabase', '1.0', 'Contacts', 10 * 1024 * 1024 );
        db.transaction(function (t) {
            t.executeSql( createSQL, [], function(t, r) {}, function(t, e) {
                alert('create table: ' + e.message);
            });
        });
        return db;
    }
}

// Create the Edit and Delete buttons for a row
function rowButtons( id, lastname ) {
    return '<form id="actions"><input class="btn btn-mini btn-success" type="button" value="Edit" onClick="javascript:editGo(' + id + ')"/>' +
        '<input class="btn btn-mini btn-warning" type="button" value="Delete" onClick="javascript:deleteGo(' + id + ', &quot;' + lastname + '&quot;)"/></form>';
}


// Main display function
function dispResults() {
    var searchString  = $("#searchInp").val();
    var searchLength = searchString.length;

    if(errorMessage) {
        element('contacts').innerHTML = errorMessage;
        return;
    }

    if(db && (searchLength < 3)) {
        db.readTransaction(function(t) {    // readTransaction sets the database to read-only
            t.executeSql('SELECT * FROM Contacts ORDER BY LOWER(lastname)', [], function(t, r) {
                var bwt = new table();
                bwt.setHeader(['Surname', 'Name', 'Email', '']);
                for( var i = 0; i < r.rows.length; i++ ) {
                    var row = r.rows.item(i);
                    bwt.addRow([row.lastname, row.firstname, row.email, rowButtons(row.id, row.lastname)]);
                }
                element('contacts').innerHTML = bwt.getTableHTML();
            });
        });
    }
    if(db && (searchLength >= 3)) {
    db.readTransaction(function(t) {    // readTransaction sets the database to read-only
        t.executeSql("SELECT * FROM Contacts WHERE lastname LIKE '%" + searchString + "%' OR firstname LIKE '%" + searchString + "%' OR email LIKE '%" + searchString + "%'"  , [], function(t, r) {
            var bwt = new table();
            bwt.setHeader(['Surname', 'Name', 'Email', '']);
            for( var i = 0; i < r.rows.length; i++ ) {
                var row = r.rows.item(i);
                bwt.addRow([row.lastname, row.firstname, row.email, rowButtons(row.id, row.lastname)]);
            }
            element('contacts').innerHTML = bwt.getTableHTML();
            $('div#contacts').highlight(searchString);
        });
    });    
    }      
}

// add or update rows in the table
function dbGo() {
    if(errorMessage) return;
    var f = element('contForm');
    var action = f.elements['inputAction'].value;
    var lastname = f.elements['lastname'].value;
    var firstname = f.elements['firstname'].value;
    var email = f.elements['email'].value;
    var key = f.elements['key'].value;

    switch(action) {
    case 'add': 
        if(! (lastname || firstname || email)) break;
        db.transaction( function(t) {
            t.executeSql(' INSERT INTO Contacts ( lastname, firstname, email ) VALUES ( ?, ?, ? ) ',
                [ lastname, firstname, email ]
            );
        }, function(t, e){ alert('Insert row: ' + e.message); }, function() {
            resetContForm();
        }); 
        break;
    case 'update':
        if(! (lastname || firstname || email)) break;
        db.transaction( function(t) {
            t.executeSql(' UPDATE Contacts SET lastname = ?, firstname = ?, email = ? WHERE id = ?',
                [ lastname, firstname, email, key ]
            );
        }, function(t, e){ alert('Update row: ' + e.message); }, function() {
            resetContForm();
        });
        break;
    }
    dispResults();
}

// update the edited row
function editGo(id) {
    db.readTransaction(function(t) {
        t.executeSql('SELECT * FROM Contacts WHERE id = ?', [id], function(t, r) {
            var row = r.rows.item(0);
            if(row) {
                var f = element('contForm');
                f.elements['lastname'].value = row.lastname;
                f.elements['firstname'].value = row.firstname;
                f.elements['email'].value = row.email;
                f.elements['goButton'].value = 'Update';
                f.elements['inputAction'].value = 'update';
                f.elements['key'].value = row.id;
                f.elements['lastname'].select();
            }
        });
    });
}

// confirm and delete a row
function deleteGo(id, lastname) {
    if(confirm('Delete ' + lastname + ' (ID: ' + id + ')?')) {
        db.transaction(function(t) {
            t.executeSql('DELETE FROM Contacts WHERE id = ?', [id]);
        });
        resetContForm();
        dispResults();
    }
}

// clear all the form fields and reset the button and action elements
function resetContForm() {
    var f = element('contForm');
    for( var n in [ 'lastname', 'firstname', 'email', 'key' ] ) {
        f.elements[n].value = '';
    }
    f.elements['inputAction'].value = 'add';
    f.elements['goButton'].value = 'Add';
}

// delete all the rows in the table
function clearDB() {
    if(confirm('Clear the entire table?')) {
        db.transaction(function(t) {
            t.executeSql('DELETE FROM Contacts');
        });
        dispResults();
    }
}

function initDisp() {
    dispResults();
}

jQuery.fn.highlight = function(pat) {
 function innerHighlight(node, pat) {
  var skip = 0;
  if (node.nodeType == 3) {
   var pos = node.data.toUpperCase().indexOf(pat);
   if (pos >= 0) {
    var spannode = document.createElement('span');
    spannode.className = 'highlight';
    var middlebit = node.splitText(pos);
    var endbit = middlebit.splitText(pat.length);
    var middleclone = middlebit.cloneNode(true);
    spannode.appendChild(middleclone);
    middlebit.parentNode.replaceChild(spannode, middlebit);
    skip = 1;
   }
  }
  else if (node.nodeType == 1 && node.childNodes && !/(script|style)/i.test(node.tagName)) {
   for (var i = 0; i < node.childNodes.length; ++i) {
    i += innerHighlight(node.childNodes[i], pat);
   }
  }
  return skip;
 }
 return this.each(function() {
  innerHighlight(this, pat.toUpperCase());
 });
};

jQuery.fn.removeHighlight = function() {
 return this.find("span.highlight").each(function() {
  this.parentNode.firstChild.nodeName;
  with (this.parentNode) {
   replaceChild(this.firstChild, this);
   normalize();
  }
 }).end();
};

window.onload = function() { 
    $("#searchInp").keyup(function() {      
      dispResults();      
    });
    initDisp();
}