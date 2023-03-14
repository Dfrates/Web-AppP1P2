#!/usr/bin/env node
const express = require('express');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const https = require('https');
const fs = require('fs');

// Read the SSL certificate and key pair
const options = {
 	key: fs.readFileSync('/etc/letsencrypt/live/dfrates.chickenkiller.com/privkey.pem'),
 	cert: fs.readFileSync('/etc/letsencrypt/live/dfrates.chickenkiller.com/fullchain.pem')
};


// temporary
let users = [];

// temporary
users = [];

// GET /api
app.get('/api', (req, res) => {
	const id = parseInt(req.query.id);
  	const user = users.find(u => u.id === id);
	if (isNaN(id)) {
		res.json(users);
	}
  	if (user) {
		res.set('Cache-Control', 'no-cache'); // add Cache-Control header
    		res.send(`User found with id ${id}: ${JSON.stringify(user)}`);
  	} else {
    		res.status(404).send(`No user found with id ${id}`);
  	}
});

// POST /api
app.post('/api', (req, res) => {
        const { name, email } = req.body;
        if (name && email) {
		const id = users.length + 1;
		const user = {id, name, email };
		console.log(user);
  		users.push(user);
                res.status(201).send(`Received a POST request to the API with name=${name} and email=${email}!`);
        } else {
                res.status(400).send('Bad Request: name and email are required fields.');
        }
});

// PUT /api
app.put('/api/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const { name, email } = req.body;
    const user = users.find(u => u.id === id);
    if (!user) {
        res.status(404).send(`No user found with id ${id}`);
    } else if (name && email) {
        user.name = name;
        user.email = email;
        res.send(`User with id ${id} has been updated`);
    } else {
        res.status(400).send('Bad Request: name and email are required fields.');
    }
});

// DELETE /api
app.delete('/api/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const userIndex = users.findIndex(u => u.id === id);
	console.log(userIndex);
    if (userIndex === -1) {
        res.status(404).send(`No user found with id ${id}`);
    } else {
	res.set('Cache-Control', 'no-cache'); // add Cache-Control header
	res.send(`User with id ${id} was deleted.`);
	users.splice(userIndex, 1);
    }
});


https.createServer(options, app).listen(3000, () => {
  console.log('Server started on port 3000');
});
