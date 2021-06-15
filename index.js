var exec = require('child_process').exec;

function execute(command, callback) {
    exec(command, function (error, stdout, stderr) {
        callback(stdout);
    });
}

getResourcesByNamespace = function (namespace, callback) {
    execute(`kubectl get deployments --output=json --namespace=${namespace} | jq -r '[.items[] | {app:.spec.template.spec.containers[0].name,replicas:.spec.replicas,resources:.spec.template.spec.containers[0].resources}]'`,
        function (response) {
            let json = JSON.parse(response);
            var items = [];
            for (var k in json) {
                let item = json[k];
                if (item.replicas === 0 || item.resources.limits === undefined || item.resources.limits.cpu === undefined || item.resources.limits.memory === undefined
                    || item.resources.requests === undefined || item.resources.requests.cpu === undefined || item.resources.requests.memory === undefined) {
                    console.log(`INFO: ${item.app} is not specified. Skipped.`);
                    continue;
                }

                var resource = {
                    app: item.app,
                    replicas: item.replicas,
                    resources: {
                        limits: { cpu: getCoreCpuUnit(item.resources.limits.cpu), memory: getGBMemoryUnit(item.resources.limits.memory) },
                        requests: { cpu: getCoreCpuUnit(item.resources.requests.cpu), memory: getGBMemoryUnit(item.resources.requests.memory) }
                    }
                };
                items.push(resource);
            }
            callback(items);
        });
};

getCoreCpuUnit = function (value) {
    let lastChar = value.charAt(value.length - 1);
    if (lastChar === 'm') {
        return value.replace('m', '') / 1000;
    };

    return value;
};

getGBMemoryUnit = function (value) {
    let lastChar = value.charAt(value.length - 2);
    if (lastChar === "M") {
        return value.replace('Mi', '') / 1024;
    }

    return Number(value.replace('Gi', ''));
};

calculateAppResouces = function (resources, clusterCount) {
    var calculatedResources = [];
    for (k in resources) {
        let item = resources[k];

        let rCpu = item.replicas * clusterCount * item.resources.requests.cpu;
        let lCpu = item.replicas * clusterCount * item.resources.limits.cpu;

        let rMem = item.replicas * clusterCount * item.resources.requests.memory;
        let lMem = item.replicas * clusterCount * item.resources.limits.memory;

        calculatedResources.push({
            app: item.app,
            replicas: item.replicas,
            totalRequestCpu: rCpu,
            totalLimitCpu: lCpu,
            totalRequestMem: rMem,
            totalLimitMem: lMem,
            requests: item.resources.requests,
            limits: item.resources.limits
        });
    }

    return calculatedResources;
};

calculateOverall = function (resources) {
    let rTotalCpu = 0;
    let lTotalCpu = 0;
    let rTotalMem = 0;
    let lTotalMem = 0;

    for (var k in resources) {
        var item = resources[k];
        rTotalCpu += item.totalRequestCpu;
        lTotalCpu += item.totalLimitCpu;
        rTotalMem += item.totalRequestMem;
        lTotalMem += item.totalLimitMem;
    }

    return {
        rTotalCpu: rTotalCpu,
        lTotalCpu: lTotalCpu,
        rTotalMem: rTotalMem,
        lTotalMem: lTotalMem
    };
};

const { argv } = require('yargs')

// console.log(argv);

getResourcesByNamespace(argv.namespace, function (response) {
    // console.log(response);
    var calcAppResponse = calculateAppResouces(response, argv.clusterCount);

    if (argv.detailed) {
        console.log(calcAppResponse);//detailed
    }
    var overall = calculateOverall(calcAppResponse);
    console.log(overall);

});

// console.log(getCoreCpuUnit("250m"));
// console.log(getGBMemoryUnit('512Mi'));