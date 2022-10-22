#!/usr/bin/env node

const request = require('sync-request');
const yaml = require('js-yaml')
const express = require('express')
var compression = require('compression')
const { exec } = require("child_process");
const execSync = require('child_process').execSync;
const app = express();
const port = 3000;
const prometheus_endpoint = process.env.PROMETHEUS_ENDPOINT;
const demo = require('./demo');
const converter = require('./converter');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression())

app.get('/data', (req, res) => {
	let ebpf_solo_io_events_hash_url = prometheus_endpoint + '/api/v1/query?query=ebpf_solo_io_events_hash';
    let ebpf_solo_io_events_hash_req = request('GET', ebpf_solo_io_events_hash_url);
	let kube_pod_info_url = prometheus_endpoint + '/api/v1/query?query=kube_pod_info';
    let kube_pod_info_req = request('GET', kube_pod_info_url);
	let kube_service_info_url = prometheus_endpoint + '/api/v1/query?query=kube_service_info';
    let kube_service_info_req = request('GET', kube_service_info_url);
	res.send({
		ebpf_solo_io_events_hash: JSON.parse(ebpf_solo_io_events_hash_req.body),
		kube_pod_info: JSON.parse(kube_pod_info_req.body),
		kube_service_info: JSON.parse(kube_service_info_req.body)
	});
});


app.get('/api/graph/fields', (req, res) => {
	console.log("retrieving fields")
	res.send(converter.fields);
});


app.get('/api/graph/data', (req, res) => {

	// Kube

	let kube = {
		items: []
	};

	JSON.parse(execSync("kubectl get pods,services -A -o json", {
		cwd: process.cwd(),
		maxBuffer: 1000 * 1000 * 10
	})).items.forEach((item) => {
		kube.items.push(item);
	});
	

	// Prometheus

	let ebpf_solo_io_events_hash_url = prometheus_endpoint + '/api/v1/query?query=ebpf_solo_io_events_hash';
    let ebpf_solo_io_events_hash_req = request('GET', ebpf_solo_io_events_hash_url);
	let kube_pod_info_url = prometheus_endpoint + '/api/v1/query?query=kube_pod_info';
    let kube_pod_info_req = request('GET', kube_pod_info_url);
	let kube_service_info_url = prometheus_endpoint + '/api/v1/query?query=kube_service_info';
    let kube_service_info_req = request('GET', kube_service_info_url);
	const data = {
		ebpf_solo_io_events_hash: JSON.parse(ebpf_solo_io_events_hash_req.body),
		kube_pod_info: JSON.parse(kube_pod_info_req.body),
		kube_service_info: JSON.parse(kube_service_info_req.body)
	}

	console.log("processing data")
	const processed = converter.process(data, kube)
	console.log(processed)

	res.send(processed);
});


app.listen(port, () => {
	console.log(`Example app listening at http://localhost:${port}`)
})


