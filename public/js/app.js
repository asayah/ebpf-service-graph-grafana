function pushIfNotExist(array, obj) {
    // To be optimized, keeping hashes in a different object
    let hash = objectHash(obj);
    let found = false;
    array.forEach((item) => {
        if(objectHash(item) == hash) {
            found = true;
        }
    });
    if(!found) {
        array.push(obj);
    }
    return found;
}

let ebpf_solo_io_events_hash = [];
let kube_pod_info = [];
let kube_service_info = [];
let nodes = [];
let edges = [];
let pod_by_ip = {};
let service_by_ip = {};
let connected_edges = {};
let kube = {};
let service_by_pod = {};

$.ajax({
    url: "/data",
    success: function (data) {
        ebpf_solo_io_events_hash = data.ebpf_solo_io_events_hash.data.result;
        kube_pod_info = data.kube_pod_info.data.result;
        kube_service_info = data.kube_service_info.data.result;
    },
    async: false
});

$.ajax({
    url: "/kube",
    success: function (data) {
        kube = data;
    },
    async: false
});

kube.items.forEach((obj1) => {
    kube.items.forEach((obj2) => {
        if(obj1.kind == 'Pod') {
            pod_by_ip[obj1.status.podIP] = obj1;
        }
        if(obj1.kind == 'Service') {
            if(obj1.spec.clusterIP != 'None') {
                service_by_ip[obj1.spec.clusterIP] = obj1;
            }
        }
        if((obj1.kind == 'Service' && obj1.spec.clusterIP != 'None') && obj2.kind == 'Pod') {
            if(obj1.spec.selector) {
                for (const [key, value] of Object.entries(obj1.spec.selector)) {
                    if(obj2.metadata.labels[key] == value) {
                        service_by_pod[obj2.status.podIP] = obj1.spec.clusterIP;
                    }
                }
            }
        }
    });
});

/*
kube_pod_info.forEach((pod) => {
    pod_by_ip[pod.metric.pod_ip] = pod.metric;
});

kube_service_info.forEach((service) => {
    if(service.metric.cluster_ip != 'None') {
        service_by_ip[service.metric.cluster_ip] = service.metric;
    }
});
*/



ebpf_solo_io_events_hash.forEach((event) => {
    if(event.metric.saddr in pod_by_ip && event.metric.daddr in service_by_ip) {
        pushIfNotExist(edges, { from: pod_by_ip[event.metric.saddr].status.podIP, to: service_by_ip[event.metric.daddr].spec.clusterIP, arrows: 'to' });
        pushIfNotExist(edges, { from: service_by_pod[pod_by_ip[event.metric.saddr].status.podIP], to: pod_by_ip[event.metric.saddr].status.podIP, arrows: 'to' });
        connected_edges[pod_by_ip[event.metric.saddr].status.podIP] = true;
        connected_edges[service_by_ip[event.metric.daddr].spec.clusterIP] = true;
        connected_edges[service_by_pod[pod_by_ip[event.metric.saddr].status.podIP]] = true;
    }
});

/*
kube_pod_info.forEach((pod) => {
    if(pod.metric.pod_ip in connected_edges) {
        pushIfNotExist(nodes, { id: pod.metric.pod_ip, label: pod.metric.pod, shape: "image", image: icons["Pod.v1"].image });
    }
});

kube_service_info.forEach((service) => {
    if(service.metric.cluster_ip in connected_edges) {
        pushIfNotExist(nodes, { id: service.metric.cluster_ip, label: service.metric.service, shape: "image", image: icons["Service.v1"].image });
    }
});
*/

kube.items.forEach((obj1) => {
    if(obj1.kind == 'Pod') {
        if(obj1.status.podIP in connected_edges) {
            pushIfNotExist(nodes, { id: obj1.status.podIP, label: obj1.metadata.name, shape: "image", image: icons["Pod.v1"].image });
        }
    }
    if(obj1.kind == 'Service') {
        if(obj1.spec.clusterIP in connected_edges) {
            pushIfNotExist(nodes, { id: obj1.spec.clusterIP, label: obj1.metadata.name, shape: "image", image: icons["Service.v1"].image });
        }
    }
});

var container = document.getElementById('mynetwork');

// provide the data in the vis format
var data = {
    nodes: new vis.DataSet(nodes),
    edges: new vis.DataSet(edges)
};

const options = {
    interaction: {
      navigationButtons: true
    },
    autoResize: true,
    physics:{
      stabilization: false
    },
    groups: icons
};

// initialize your network!
var network = new vis.Network(container, data, options);

/*
let cy = cytoscape({
    container: document.getElementById('mynetwork'), // container to render in
    elements: {
        nodes: nodes,
        edges: edges
    },
    boxSelectionEnabled: false,
    layout: {
        name: 'concentric'
    },
    style: [
        {
            selector: 'node',
            style: {
                'content': 'data(id)',
                'label': 'data(label)',
                'text-valign': 'bottom',
                'background-image': 'data(image)',
                'background-fit': 'contain',
                'background-opacity': '0'
            }
        }
    ]
});
*/
