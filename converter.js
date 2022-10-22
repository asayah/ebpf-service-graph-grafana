
var hash = require('object-hash');
const { v4: uuidv4 } = require('uuid');

function pushIfNotExist(array, obj) {
    // To be optimized, keeping hashes in a different object
    let hashed = hash(obj);
    let found = false;
    array.forEach((item) => {
        if(hash(item) == hashed) {
            found = true;
        }
    });
    if(!found) {
        array.push(obj);
    }
    return found;
}


function process (data, kubedata) {

    let ebpf_solo_io_events_hash = data.ebpf_solo_io_events_hash.data.result;
    let nodes = [];
    let edges = [];
    let pod_by_ip = {};
    let service_by_ip = {};
    let connected_edges = {};
    let kube = kubedata;
    let service_by_pod = {};
    
    
    
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
    
    ebpf_solo_io_events_hash.forEach((event) => {
        if(event.metric.saddr in pod_by_ip && event.metric.daddr in service_by_ip) {
            pushIfNotExist(edges, 
                {
                    id: uuidv4(),
                    mainStat: "53/s",
                    source: pod_by_ip[event.metric.saddr].status.podIP,
                    target: service_by_ip[event.metric.daddr].spec.clusterIP
                }),
                
            
            pushIfNotExist(edges, 
                {   id: uuidv4(),
                    source: service_by_pod[pod_by_ip[event.metric.saddr].status.podIP],
                    target: pod_by_ip[event.metric.saddr].status.podIP
                }),
            connected_edges[pod_by_ip[event.metric.saddr].status.podIP] = true;
            connected_edges[service_by_ip[event.metric.daddr].spec.clusterIP] = true;
            connected_edges[service_by_pod[pod_by_ip[event.metric.saddr].status.podIP]] = true;
        }
    });
    
    kube.items.forEach((obj1) => {
        if(obj1.kind == 'Pod') {
            if(obj1.status.podIP in connected_edges) {
                pushIfNotExist(nodes,
                    
                    {
                        id: obj1.status.podIP,
                        title: obj1.metadata.name
                    })
            }
        }
        if(obj1.kind == 'Service') {
            if(obj1.spec.clusterIP in connected_edges) {
                pushIfNotExist(nodes,
                    {
                        id: obj1.spec.clusterIP,
                        title: obj1.metadata.name
                })  
            }
        }
    });

    const res = {
        edges: edges,
        nodes: nodes
    }

    return res
}



const fields = {
	"edges_fields": [
	  {
		"field_name": "id",
		"type": "string"
	  },
	  {
		"field_name": "source",
		"type": "string"
	  },
	  {
		"field_name": "target",
		"type": "string"
	  }
	],
	"nodes_fields": [
	  {
		"field_name": "id",
		"type": "string"
	  },
	  {
		"field_name": "title",
		"type": "string"
	  }
	]
  }


module.exports = {
    process: process,
    fields: fields
};
