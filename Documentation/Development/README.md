# Preamble

> The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL
> NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED",  "MAY", and
"OPTIONAL" in this document are to be interpreted as described in
[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

# Architecture

This documents describes the high level architecture of the services
consuming [Oma.WndwCtrl](https://github.com/OlliMartin/wndw.ctl) (aka: "__Any Computer as a Device__" `=: ACAAD`).
As of now, this includes:

- [ioBroker](https://github.com/ioBroker/ioBroker) Adapter

For each _connected service_ (`=:CS`) a corresponding documentation detailing the environment/consumer-specifics can be
found [here](./Integrations).

See [ACAAD Documentation](https://github.com/OlliMartin/wndw.ctl/blob/main/README.md) for more detailed information
about the project.

# Assumptions

This section describes assumptions made that apply to all integrations, i.e. platforms consuming
the [Oma.WndwCtrl](https://github.com/OlliMartin/wndw.ctl)
service ([ioBroker](https://github.com/ioBroker/ioBroker), [HomeAssistant](https://www.home-assistant.io/), ..).
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
major version of the `CS`. To not match _just any_ OpenAPI definition present in the scanned network, an additional
check SHOULD be performed on the `info` property of the retrieved document.

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
| Actionable     | `$.acaad.actionable`         | no       | Indicator that this component is actionable (`CS` to `ACAAD` sync). MUST be unique (value==true) per component                              |
| Queryable      | `$.acaad.queryable`          | no       | Indicator that this component is queryable (`ACAAD` to `CS` sync). MUST be unique (value==true) per component                               |
| Idempotent     | `$.acaad.idempotent`         | yes      | Indicator that the command (attached to the component) is idempotent, meaning that it MAY be retried                                        |

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
            "actionable": true,
            "idempotent": false
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

This section describes how to initially create the corresponding objects in the `CS`s and how to keep them in sync as
the applications run. A high-level architecture overview will be provided in the form of class diagrams, where the `CS`
MAY extend (or MUST implement) specific classes/interfaces to fulfill the target platform's needs.
Mainly those requirements arise from how the platforms deal with different kinds of objects, i.e. the process of
mapping `ACAAD` components (and their capabilities) to platform-specific devices/objects. The mappings for each
connected service MUST be defined in detail in the specific documentation section.

### Requirements

- All `ACAAD` specific logic MUST be handled in an integration-agnostic (`CS`) manner
    - Interfaces for integrations, for example how states/components are created MUST be made available (and used)
- HTTP (and SignalR) connections, requests and response handling MUST NOT be `CS` specific
    - Connection details, authentication information, etc. MUST be retrieved through an integration-specific layer
    - Authentication (bearer) tokens MUST be injected by the request pipeline; They MUST NOT be handled in functional
      code
    - Token retrieval (during the pipeline execution) MUST use _caching_ and retries. `CS`-agnostic interfaces MUST be
      provided and used for caching
- The orchestration of all functionality MUST be owned by the agnostic layer. `CS`-specifics MUST be injected by
  composition (the following class diagram accounts for this)

### Data Model

The following class diagram partially models the OpenAPI definition and the `ACAAD` specific extensions (defined
in [Service Discovery](#service-discovery) and [Device Discovery](#device-discovery) respectively.)

``` mermaid
classDiagram
direction BT

class AcaadComponentMetadata {
  type: string
  name: string
}

class AcaadUnitOfMeasure {
  <<enum>>
  Celsius,
  DeciBel,
  // Others
}

class AcaadDataMetadata {
  +UnitOfMeasureHint: AcaadUnitOfMeasure
}

class AcaadMetadata {
   +Component: AcaadComponentMetadata
   +Actionable: bool
   +Queryable: bool
   +Idempotent: bool
}

AcaadMetadata --|> AcaadComponentMetadata : Component
AcaadMetadata --|> AcaadDataMetadata : Data

class PathItemObject {
  Acaad: AcaadMetadata
}

PathItemObject --|>  AcaadMetadata : Acaad

class OpenApiDefinition {
  Paths: Record~string, PathItemObject~
}

OpenApiDefinition --|> PathItemObject : Paths
```

### Orchestration

``` mermaid
classDiagram
direction BT

class ComponentDescriptor {
  +Name: string
}

class ComponentType {
  <<enum>>
  Button,
  Switch, 
  Sensor
}

class Component {
  +Type: ComponentType
}

Component --> ComponentDescriptor
Component --|> ComponentType : Type

class AcaadEvent {
  +EventType: string
  +Name: string
  +ComponentName: string
}

class IConnectedServiceAdapter {
  <<interface>>
  
  GetComponentDescriptor(component: unknown) Option~ComponentDescriptor~
  GetComponentDescriptor(metadata: AcaadComponentMetadata) ComponentDescriptor
  
  TransformUnitOfMeasure(uom: AcaadUnitOfMeasure) unknown
  TransformComponentValue(value: Option~unknown~) PRIMITIVE
  
  CreateComponentModelAsync(component: Component)
  
  UpdateComponentStateAsync(cd: ComponentDescriptor, obj: PRIMITIVE)
}

class ComponentManager {
  - ServiceAdapter : ServiceAdapter
  - AbortController : AbortController

  CreateMissingComponentsAsync()
  - QueryComponentConfigurationAsync() Option~OpenApiDefinition~
  
  HandleOutboundStateChangeAsync(component: unknown, value: Option~unknown~)
  - HandleSuccessfulStateChangeAsync()
    
  HandleInboundStateChangeAsync(event: AcaadEvent)
  
  # HandleStateChangeFailureAsync(component: ComponentDescriptor)
  
  StartAsync()
  - OpenSignalRChannelAsync(abortSignal: AbortSignal)
  
  ShutdownAsync()
  - CloseSignalRChannelAsync()
}

ComponentManager --|> IConnectedServiceAdapter : ServiceAdapter
```

Note: Parameter and return types are shown simplified, i.e. Tasks/Promises are omitted from the diagram. Request
cancellation MUST be supported, but SHOULD be abstracted away through the agnostic request layer. For this purpose
`AbortController` and `AbortSignal`s are used, which are supported by both `Axios` and `SignalR`.

In the above diagram all integration-specific concerns are handled by the interface `IConnectedServiceAdapter` a
reference of which SHOULD be obtained through dependency injection. Presumably not all methods need to be `async`,
however to avoid unnecessary refactoring overhead during implementation of upcoming `CS` they will be handled
asynchronously from the beginning.

### Object/State Creation

`Object/State` creation refers to the process of mapping the `ACAAD` configuration to the integration service's internal
state management. It involves translating component types (`Button`, `Sensor`, etc.) into the specific data structure
the broker understands.
No `CS` MUST ever delete existing, i.e. previously created, states. All configuration MUST be strictly additive, and it
MUST be the users responsibility to manually clean up. A convenience method to delete _all_ existing states and resync
from scratch MAY be added, however in that case it MUST be user initiated; Not automatic.

Rationale: It is impossible to know how the components are used by the user in their respective system, so to be on the
safe side no object deletion is allowed. The same approach is chosen for updated components: If a component changes (for
example its type) it will remain in the tree unchanged until a manual `resync` action triggered _by the user_.
The `CS` SHOULD indicate to the user (log) that the full configuration cannot be applied because of previously created
states.

The `ComponentManager` will be responsible to create the (missing) states: It will collect the information from
`OpenAPI`, let the `CS` adapter generate the integration-specific objects (i.e. states) in memory and persist them.

Refer to `ComponentManager.CreateMissingComponentsAsync` in the above class diagram.

### Sync: CS to ACAAD

The synchronization of outbound state changes, that means a user manually (or automated) changing the state of a
component in the integration, MUST be synced utilizing the exposed (component) ReST apis. For this, first the host of
the `ACAAD` service is retrieved and the OAuth2 token is injected (as an axios aspect/interceptor). The `CS`-agnostic
layer MUST provide a class `ConnectionManager` to execute requests against component APIs, which aggregates
the [Axios](https://axios-http.com/docs/intro) instance.

``` mermaid
classDiagram 
direction BT

class AcaadAuthentication {
  TokenEndpoint: string
  ClientId: string
  ClientSecret: string,
  Grants: Array~string~
}

class AcaadHost {
  Host: string
  Port: number
}

class OAuth2Token {
  Expires: number,
  AccessToken: string,
  RefreshToken: string,
  Grants: Array~string~
}

AcaadHost --|> AcaadAuthentication : Authentication

class TokenCache {
  <<interface>>
  GetAsync(authentication: AcaadAuthentication) Option~OAuth2Token~
}

class ConnectionManager {
  -Axios: Axios
  -TokenCache: TokenCache
  
  -RetrieveAuthenticationAsync(): OAuth2Token
  
  +QueryComponentConfigurationAsync(host: AcaadHost) Option~OpenApiDefinition~
  
  +UpdateComponentStateAsync(metadata: AcaadMetadata, value: Option<PRIMITIVE>)
}

ConnectionManager --|> TokenCache : TokenCache
```

__Note:__ Boilerplate parameters and return types, such as `AbortSignal` and `Promise<T>` are omitted from the above
class diagram for readability.

Refer to `ComponentManager.HandleOutboundStateChangeAsync` in the general architecture section.

### Sync: ACAAD to CS

`ACAAD` MUST expose a [SignalR](https://dotnet.microsoft.com/en-us/apps/aspnet/signalr) hub as defined in
section [Service Connection](#acaad-to-cs). The hub defines one interface to push events to the `CS` which MUST be
translated into state updates (or otherwise reacted upon depending on the specific type). For state updates, `ACAAD`
MUST provide the component name inside the event payload, which MUST be translatable to a `ComponentDescriptor` on `CS`
side. The client used MUST be [@microsoft/signalr](https://www.npmjs.com/package/@microsoft/signalr).
To obtain the OAuth2 token, which is REQUIRED for secure authentication, the same mechanism as defined in
the [previous section](#sync-cs-to-acaad) MUST be used.

Refer to `ComponentManager.HandleInboundStateChangeAsync` in the above class diagram.

## `ACAAD` Interface Updates

As stated above, the `CS` MUST use its own semver version (major) to determine the `ACAAD` API endpoint to contact. This
means that breaking changes on `ACAAD` lead directly to a new major in the `CS`s, ensuring compatibility between the two
services. Any major update _only on the `CS`_ is hence nonsensical.

__Note:__ In the case of vulnerable third party packages that needs to be addressed asap, which would result in a
breaking change on `CS` side a _compability_ flag or map SHOULD be used to follow a clear semver approach. That means
the `CS` SHOULD indicate it is compatible _only_ with a previous version of `ACAAD`. This requires some degree of
attention to detail, as in such an event the `CS` and `ACAAD` major run out of sync and without proper handling the `CS`
would advertise itself as compatible with an _upcoming_ `ACAAD` version, while it is not. In the end, the `CS` MUST know
(in a generic way) how many versions `CS` is ahead of `ACAAD`. Since `ACAAD` is always maintaining backwards
compatibility by versioning the APIs (v1, v2, ...) and hosting _all_ at the same time, no special handling is required
in that case.

## Development Mode

`ACAAD` MAY offer a feature called 'Development Mode' which allows the user to _temporarily_ circumvent security
measures, like the enforcement of a secure transport channel (HTTPS) or use of authentication. Additionally, `ACAAD` MAY
host convenience endpoints for testing. This includes endpoints for updating the component configuration, testing "
ad-hoc" commands including execution, transformation files to test the CLI parser, an event recorder that tracks raised
events directly on `ACAAD` and potentially others.

If the development mode is enabled there MUST be a clear indication to the end-user about the risks, both on `ACAAD` and
`CS` side.
Most importantly _enabling_ development mode MUST NOT be possible without administrative access directly to the machine
where `ACAAD` is running. The enablement flag SHOULD NOT be stored alongside the regular configuration. There MUST be no
way to enable development mode from within `ACAAD`. It MUST be a manual (elevated-permission) user interaction.