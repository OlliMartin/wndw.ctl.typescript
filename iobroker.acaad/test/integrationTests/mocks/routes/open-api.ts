const openApi = [
    {
        id: "openApi", // id of the route
        url: "/openapi/v1.json", // url in path-to-regexp format
        method: "GET", // HTTP method
        variants: [
            {
                id: "sensor", // id of the variant
                type: "json", // variant type
                options: {
                    status: 200,
                    body: {
                        paths: {
                            "/components/oma-service-status": {
                                get: {
                                    acaad: {
                                        component: {
                                            name: "oma-service-status",
                                            type: "sensor",
                                        },
                                        queryable: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        ],
    },
];

export default openApi;
