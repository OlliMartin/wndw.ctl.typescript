// This must be executed before any access to the actual container.
import "reflect-metadata";

import { ClassProvider, container, DependencyContainer, RegistrationOptions, registry, InjectionToken } from "tsyringe";
import ComponentManager from "./ComponentManager";
import ConnectionManager from "./ConnectionManager";
import DependencyInjectionTokens from "./model/DependencyInjectionTokens";
import { IConnectedServiceContext } from "./interfaces/IConnectedServiceContext";
import { InMemoryTokenCache } from "./services/InMemoryTokenCache";
import { Effect, Queue } from "effect";
import { AcaadEvent } from "./model/events/AcaadEvent";

@registry([
    { token: ComponentManager, useClass: ComponentManager },
    {
        token: DependencyInjectionTokens.ConnectionManager,
        useClass: ConnectionManager,
    },
    { token: DependencyInjectionTokens.TokenCache, useClass: InMemoryTokenCache },
    {
        token: DependencyInjectionTokens.Logger,
        useFactory: (c) => c.resolve<IConnectedServiceContext>(DependencyInjectionTokens.Context).logger,
    },
    {
        token: DependencyInjectionTokens.EventQueue,
        useValue: Effect.runSync(Queue.unbounded<AcaadEvent>()), // TODO: Define drop-strategy and set bound for capacity
    },
])
export class FrameworkContainer {
    private static Container: DependencyContainer = container;

    private _childContainer: DependencyContainer;
    private _isBuilt: boolean = false;

    constructor(childContainer: DependencyContainer) {
        this._childContainer = childContainer;
    }

    public static CreateCsContainer<T>(provider: ClassProvider<T>, options?: RegistrationOptions): FrameworkContainer {
        const childContainer = FrameworkContainer.Container.createChildContainer();
        childContainer.register<T>(DependencyInjectionTokens.ConnectedServiceAdapter, provider, options);

        return new FrameworkContainer(childContainer);
    }

    public WithContext<T extends IConnectedServiceContext>(token: InjectionToken<T>, value: T): FrameworkContainer {
        this.ThrowIffBuilt();

        this._childContainer.register<IConnectedServiceContext>(DependencyInjectionTokens.Context, { useValue: value });
        this._childContainer.register<T>(token, { useValue: value });

        return this;
    }

    public Build(): DependencyContainer {
        this.ThrowIffBuilt();
        return this._childContainer;
    }

    private ThrowIffBuilt(): void {
        if (this._isBuilt) {
            throw new Error("Container has already been built");
        }
    }
}
