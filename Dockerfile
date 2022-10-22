FROM node
RUN mkdir /ebpf-service-graph-grafana
ADD ebpf-service-graph-grafana.js /ebpf-service-graph-grafana/
ADD demo.js /ebpf-service-graph-grafana/
ADD public /ebpf-service-graph-grafana/public
ADD package.json /ebpf-service-graph-grafana/
WORKDIR /ebpf-service-graph-grafana
RUN npm install .
RUN curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
RUN chmod +x kubectl
RUN mv kubectl /usr/local/bin/