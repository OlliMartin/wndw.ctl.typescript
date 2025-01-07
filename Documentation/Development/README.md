# Preamble

> The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL
> NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED",  "MAY", and
"OPTIONAL" in this document are to be interpreted as described in
[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

# Architecture

This documents describes the high level architecture of the services
consuming [Oma.WndwCtrl](https://github.com/OlliMartin/wndw.ctl) (aka: `ACAAD`).
As of now, this includes:

- [IoBroker](https://github.com/ioBroker/ioBroker) Adapter

For each _connected service_ (`=:CS`) a corresponding documentation detailing the environment/consumer-specifics can be
found [here](./Integrations).

See [ACAAD Documentation](https://github.com/OlliMartin/wndw.ctl/blob/main/README.md) for more detailed information
about the project.

# Assumptions

This section describes assumptions made that apply to all integrations, i.e. platforms consuming
the [Oma.WndwCtrl](https://github.com/OlliMartin/wndw.ctl)
service ([IoBroker](https://github.com/ioBroker/ioBroker), [HomeAssistant](https://www.home-assistant.io/), ..).
Additionally, it defines how `ACAAD` is expected to behave to have a common, "set-in-stone" interface between the
respective services.
These assumptions may or may not yet be applicable/implemented on `ACAAD` but will be used as reference in
further updates/development.

## Service Connection

The connection between all `CS`s and `ACAAD` SHALL be bidirectional in general, but using different protocols depending
on the direction of the data flow. `ACAAD` MUST provide a `ReST` API that fully describes the available devices,
including its capabilities and means of interaction. This information `MAY` be made available through augmentation of
the [OpenAPI](https://www.openapis.org/) specification with device-specific metadata (such as `type`, `unit-of-measure`
hints, etc.).

While `CS`s MAY define additional behaviour for components (devices), especially w.r.t. their own state handling, the
means of interacting with a device _on `ACAAD`_ MUST be defined directly in the service. As an example, a device of
`type=button` MUST define how to `press`/`actuate` it, which is subsequently used by the `CS` for interactions.

### CS to ACAAD

All communication from any connected service to `ACAAD` MUST be implemented through `ReST` APIs. For example, if a
`button` needs to be actuated, the CS will send a request to the determined endpoint. This request SHOULD be sent over a
secure channel (`HTTPS`) and SHOULD be authenticated via OAuth2.
For the means of authentication and authorization _any_ third-party identity provider (for
example [Keycloak](https://www.keycloak.org/)
or [Synology OAuth2](https://kb.synology.com/en-us/DSM/help/OAuthService/oauth_service_desc?version=7)) MUST be
compatible.

__Rationale:__ While it would be possible to use a real-time communication technology
like [SignalR](https://dotnet.microsoft.com/en-us/apps/aspnet/signalr), this approach has some drawbacks: Mainly, it
tightly couples both services together, as the `CS` must know about the function to call on the remote end, without the
means of populating said functions in a typesafe manner.
With a restful approach this can be avoided by providing metadata ([HATEOAS](https://en.wikipedia.org/wiki/HATEOAS))
about the invokable actions directly in the device-definition, allowing for a generalized implementation against an
_industry standardized_ mechanism.

From a `CS` point-of-view these interactions are _always_ synchronous, that means it is helpful to immediately know (and
acknowledge) the outcome of any operation.

### ACAAD to CS

All communication from `ACAAD` to `CS` MUST happen event-based and strictly typed, where each event MUST be uniquely
identifiable by its type. All `CS`s SHOULD connect/subscribe to the provided (single)
event-[hub](https://learn.microsoft.com/en-us/aspnet/core/signalr/hubs?view=aspnetcore-9.0), where `ACAAD` SHOULD
publish all observable-relevant messages. This MUST include state-changes (to devices with a state),
configuration-changes and (
`ACAAD`) service health.

__Rationale:__ Though it would be possible to rely on a purely ReST driven approach, this results in needless polling
for state updates which is especially harmful in a scenario where the data on `ACAAD` rarely changes - which is the
expected behaviour. Instead, [SignalR](https://dotnet.microsoft.com/en-us/apps/aspnet/signalr) is used to push the
events directly to the `CS` in a single exposed interface (=: `hub`). That is, all communication from `ACAAD` to `CS`s
follows the same basic event contract, where `ACAAD` can augment the payload with environment/device/state specific
information. This additional information MUST be understood by all `CS`s, follow well-defined contracts and contain
sufficient data to uniquely identify the mapped component on `CS` side.

The event model (hierarchy) MUST be exposed as an
[OpenAPI schema](https://swagger.io/docs/specification/v3_0/data-models/data-models/) to allow (iterative) generation of
the respective type hierarchy in the connected service. The process of generating/updating the models SHOULD be added as
a build step to each `CS` or be set up as a referencable repository to be shared between multiple `CS` (tbd:
Versioning).

## Security

There MUST be a possibility to configure both `ACAAD` and the `CS` to use a secure-channel (for both ReST and hub
connections). Authentication and Authorization MUST happen via OAuth2, where the user of `ACAAD` can define _on
component/device level_ which roles/grants are required for an interaction. Any OAuth2 identity provider MUST be
supported. For all configured components `ACAAD` MUST verify that an action is authorized.

### ACAAD Configuration

There SHALL NOT be _any_ way to configure `ACAAD` from a connected service. Configurations MUST be done strictly on the
host itself, where some utility/convenience endpoints MAY be provided. These MUST be handled with extreme care and
clearly communicated to the end-user, both on `ACAAD` and `CS` side about the risks involved.

The configuration, given that it is a json/file based one, SHOULD always be signed (appended as an additional property
to the file) by an end-user, using his (to `ACAAD` unknown) _private_ key.
It MUST be made possible to configure the public key to verify the validity of the configuration as an installation
process, subsequently making it immutable.
This public key must be stored separately from the configuration and in a (to `ACAAD`) read-only manner.
As an example, for Windows this MAY be achieved by defining a specific certificate name in the users `Personal` (or
other) certificate storage that is loaded upon startup and used to verify the signature. If the configuration's validity
cannot be established, for example because the certificate is not found, the configuration contains no signature, etc,
`ACAAD` MUST terminate _without_ indicating the root cause.

__EXCEPTION:__ The _only_ exception to the outlined behaviour is if the user actively uses `ACAAD` in _development_
mode. In this case a warning MUST be written that not all security features are effective. These warnings MUST be
propagated to all connected `CS` using the described event approach (see section [ACAAD to CS](#acaad-to-cs)). The `CS`
SHOULD make the user aware of such configuration issues/concerns. This applies to the usage of `HTTPS` over `HTTP` and
unauthorized access as well.

## Service Discovery

The service discovery (of `ACAAD` instances) MUST be implemented based on the information provided through an OpenAPI
definition. The `CS` MUST scan for such definitions (`openapi/v{$VERSION}`), where `$VERSION` is the (compatibility)
major version of the `CS`. To not match _any_ OpenAPI definition present in the scanned network, an additional check
SHOULD be performed on the `info` property of the retrieved document.

`ACAAD` MUST advertise itself in the following way:

``` json
{
    "openapi": "3.0.1",
    "info": {
        "title": "$title",
        "version": "$semverVersion",
        "acaad": "$commitHash"
    }
}
```

where `$title` is a user-definable title (`ACAAD` SHOULD provide a fallback), `$semverVersion` is the `ACAAD` version
following semantic versioning ([semver](https://semver.org/)) and `$commitHash` is the git commit hash out of which the
service was built. `ACAAD` SHOULD implement a mechanism to populate the current commit hash in an automated manner.   
Needless to say, the OpenAPI definition endpoint MUST be publicly available (not protected by authentication) for
discovery to work.
Every connected service SHOULD perform a check on the `acaad` (json path `$.info.acaad`) to ensure that a discovery
OpenAPI definition _certainly_ belongs to an `ACAAD` service.
To aid the user in the setup process there SHOULD be some kind of feedback including the count of discoverable devices
per service. Refer to the chapter [Device Discovery](#device-discovery) for more information.

__Note:__ This approach is in accordance with the OpenAPI standard, which explicitly allows extension data (the `acaad`
property). Refer to [this](https://swagger.io/specification/) document, section `Info Object`.

## Device Discovery

The device discovery, that is which components/devices are _configured_ on `ACAAD` side, MUST happen based on the
OpenAPI definition and MUST follow the same versioning guidelines defined in section
[Service Discovery](#service-discovery). In short: The `CS` MUST use the OpenAPI endpoint corresponding to the _major_
version of its semver. This ensures compatibility between the two solutions and enforces proper propagation of breaking
changes.

__Important:__ The augmentation of the OpenAPI document with `ACAAD` specifics MUST NOT inhibit the functionality of the
used graphic OpenAPI UI renderer in _any_ way.

`ACAAD` MUST provide the following metadata with each _endpoint_ mapping directly to a device/component:

| Type           | JsonPath                     | Required | Description                                                                                                                                 |
|----------------|------------------------------|----------|---------------------------------------------------------------------------------------------------------------------------------------------|
| Component.Type | `$.acaad.component.type`     | yes      | The type of the component. Possible values are defined [here](https://github.com/OlliMartin/wndw.ctl/blob/main/Documentation/Components.md) |
| Component.Name | `$.acaad.component.name`     | yes      | The unique name of the component (defined in the configuration)                                                                             |
| Data.UOM.Hint  | `$.acaad.unitOfMeasure.hint` | no       | Indicator which _unit of measure_ the component _produces_. (defined in the configuration)                                                  |

An example endpoint SHOULD be represented like the following json snippet:

``` json
"/components/sample-button/trigger": {
    "post": {
        "tags": [
            "sample-button"
        ],
        "summary": "Trigger",
        "responses": {
        "200": {
            "description": "OK",
            "content": {
                "application/json": {
                "schema": {
                    "$ref": "#/components/schemas/ComponentCommandOutcomeEvent"
                }
              },
            }
        },
        "acaad": {
            "component": {
                "type": "button",
                "name": "sample-button"
            },
            "actionable": true
        },
    },
  }
},
```

__Note:__ The additional metadata (property `acaad`) is defined on the path level (in OpenAPI
terms [PathItemObject](https://swagger.io/specification/)), not on the `PathObject` itself. This leads to data
duplication, since `ACAAD` is designed to group the components by URL already. However, writing extension data directly
into the `PathObject` is not (easily) achievable in Asp.Net. Additionally, the overhead of the duplication is minimal
and the API is called very infrequently; hence it is not worth spending effort to remove the duplication.
As an added bonus this approach allows providing specific metadata on an endpoint__+method__ basis, for example a
`Button` component could specify in its `POST:/trigger` endpoint that this endpoint is _actionable_ (as indicated in the
example above).

During device discovery, the `CS`s SHOULD iterate over all paths (json path `$.paths`), identify all `PathItemObject`s
that contain the `acaad` metadata property and group by the component's name (`$.paths[..]acaad.name`). This
computation gives the number of (unique) components configured on `ACAAD`. Additionally, a `CS` MAY group the components
by type to show as additional information to the user.

As already indicated in the example above the OpenAPI definition MUST include possible API responses (
`ComponentCommandOutcomeEvent`, not all listed in the example).
Returning the event types directly from the API exposes them indirectly in the definition, simplifying client
generation. `ACAAD` MUST use the identical events (for those components) when pushing data via `SignalR`.

## Device Types

The device/component types are defined in
the [documentation](https://github.com/OlliMartin/wndw.ctl/blob/main/Documentation/Components.md) of `ACAAD`. The `CS`
MUST follow the identical semantics.

## Device State Management

__ TODO (only bullet points) FROM HERE __

- Put event types in [Produces] of respective component endpoint, syncing the event types.
- Event types must be in a well organized type hierarchy
- Use the event payload as return type (in positive+negative case) (-> Change delegating executor to return event
  instead of outcome)

## Data/State Migration

### `ACAAD` Configuration Updates

- Unique identifier is name of device
- Never delete old component models, let user do it
- strictly local (server where ACAAD is installed) flow (unless in developer mode)

### `ACAAD` Interface Updates

- applies to rest and signalR
- All endpoints versioned (v1, v2, ..) -> match semver (major) of CS

## Development Mode

- Realized via C# feature flag
- Exposes testing (rest) endpoints for:
    - configuration updates
    - command & transformation testing
    - event recorder (+replay)
    - allows unauthorized access
    - MUST log and populate (to CS) warnings