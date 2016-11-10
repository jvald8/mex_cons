require('dotenv').config();
// require the .env variables

var mysql = require('mysql');

var pool = mysql.createPool({
	connectionLimit: 10,
	host: process.env.MYSQL_HOST,
	user: process.env.MYSQL_USER,
	password: process.env.MYSQL_PASSWORD,
	database: process.env.MYSQL_DB,
	port: process.env.MYSQL_PORT
});

exports.getUser = function(data, cb) {

	pool.getConnection(function(err, connection) {
		connection.query(`SELECT * FROM humans WHERE fb_id=${data.id}`, function(err, rows, fields) {
			if(err) throw err;
			//console.log({user_exists: rows});
			// if it doesn't exist, create a new user.
			if(rows.length === 0) {

				connection.query(`INSERT INTO humans VALUES (null, ${data.id}, null, '${data.name.familyName}', '${data.name.givenName}', '${data.gender}', '${data.profileUrl}', '${data._json.verified}', '${data.photos[0].value}', ${data._json.friends.summary.total_count}, null)`, function(err, rows, fields) {
					
					if(err) throw err;

					console.log({post_message: `created user: ${data.name.givenName} ${data.name.familyName} in humans table`})

					connection.release();

					cb(rows);
					
				});

			} else {

				connection.release();

				cb(rows);
			}
			
		});
	});
}

exports.profileFinished = function(profileId, res) {
	pool.getConnection(function(err, connection) {

		connection.query(`SELECT * FROM humans where fb_id=${profileId}`, function(err, rows, fields) {
			if(err) throw err;

			if(rows[0] !== undefined) {
				if(!rows[0].email) {
					res.redirect('/finishProfile');
				} else {
					res.redirect('/app')
				}
			}

			res.status(200);

			connection.release();
		})
	})
}

exports.getUserObject = function(id, db) {

	pool.getConnection(function(err, connection) {

		connection.query(`SELECT * FROM humans WHERE fb_id=${id}`, function(err, rows, fields) {
			if(err) throw err;

			if(rows.length !== 0) {

				connection.release();
				db(err, rows)
			}
		})
	});
}

exports.addUserEmailandLocation = function(data, db) {
	pool.getConnection(function(err, connection) {

		var userId = parseInt(data.body.id),
			email = data.body.email,
			location = data.body.location;

		connection.query(`Update humans set email = '${email}', location = '${location}' where fb_id=${userId}`,function(err,rows,fields) {
			if(err) throw err;
			console.log(rows)

			connection.release();
		});

	});

	return db.redirect('/app');
}

exports.addRestOfInfo = function(data, db) {
	pool.getConnection(function(err, connection) {
		console.log({data: data.body.human_id})
		//var data = data.body;
		console.log({human_id: data.body.human_id})
		connection.query(`SELECT * FROM progress where human_id=${data.body.human_id}`, function(err, rows, fields) {
			if(err) throw err;

			if(rows.length === 0) {
				connection.query(`INSERT INTO progress VALUES (null, '${data.body.human_id}', ${isTrue(data.body.birth_certificate)}, ${isTrue(data.body.government_id)}, ${isTrue(data.body.parent_certificate)}, ${isTrue(data.body.marriage_license)}, ${isTrue(data.body.parent_license)}, ${isTrue(data.body.marriage_license)})`, function(err, rows, fields) {
					if(err) throw err;
					console.log({progress_record: `progress_record created for ${data.body.human_id}`});

					connection.release();
				})
			}

			if(rows.length !== 0) {
				connection.query(`Update progress set birth_certificate = ${isTrue(data.body.birth_certificate)}, government_id = ${isTrue(data.body.government_id)}, parent_certificate = ${isTrue(data.body.parent_certificate)}, marriage_license = ${isTrue(data.body.marriage_license)}, parent_license = ${isTrue(data.body.parent_license)}, witness_license = ${isTrue(data.body.parent_license)} where human_id=${data.body.human_id}`, function(err, rows, fields) {

					if(err) throw err;
					console.log({progress_record: `progress_record updated for ${data.body.human_id}`});

					connection.release();
				});
				
			}

		});
	});
	return db.redirect('/app');
}

function isTrue(input) {
	if(input === undefined){return false}
	return true;
}