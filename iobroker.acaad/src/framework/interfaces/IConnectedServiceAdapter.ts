import { ComponentDescriptor } from "../model/ComponentDescriptor";
import { AcaadComponentMetadata } from "../model/AcaadComponentManager";
import { AcaadUnitOfMeasure } from "../model/AcaadUnitOfMeasure";
import { Component } from "../model/Component";
import { AcaadHost } from "../model/connection/AcaadHost";

import { AcaadError } from "../errors/AcaadError";
import { Effect } from "effect";
import { Option } from "effect/Option";
import { AcaadHostMapping, AcaadServerMetadata } from "../model/open-api/OpenApiDefinition";

export type ChangeType = "action" | "query";

export type OutboundStateChangeCallback = (
    component: Component,
    type: ChangeType,
    value: Option<unknown>,
) => Promise<boolean>;

interface IConnectedServiceAdapter {
    getComponentDescriptor(component: unknown): Option<ComponentDescriptor>;

    getComponentDescriptorByComponent(component: Component): ComponentDescriptor;

    transformUnitOfMeasure(uom: AcaadUnitOfMeasure): unknown;

    transformComponentValue(value: Option<unknown>): unknown;

    createServerModelAsync(server: AcaadServerMetadata): Promise<void>;

    onServerConnectedAsync(server: AcaadHost): Promise<void>;

    onServerDisconnectedAsync(server: AcaadHost): Promise<void>;

    createComponentModelAsync(component: Component): Promise<void>;

    registerStateChangeCallbackAsync(cb: OutboundStateChangeCallback, as: AbortSignal): Promise<void>;

    updateComponentStateAsync(cd: ComponentDescriptor, obj: unknown): Promise<void>;

    // TODO: Change to promise (keep the effect-ts stuff internal)
    getConnectedServersAsync(): Effect.Effect<AcaadHost[], AcaadError>;

    getAllowedConcurrency(): number;
}

export default IConnectedServiceAdapter;
