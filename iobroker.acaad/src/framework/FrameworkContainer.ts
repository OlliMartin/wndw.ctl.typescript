import { container, DependencyContainer, registry } from "tsyringe";
import ComponentManager from "./ComponentManager";
import ConnectionManager from "./ConnectionManager";

@registry([
    { token: ComponentManager, useClass: ComponentManager },
    {
        token: ConnectionManager,
        useClass: ConnectionManager,
    },
])
export class FrameworkContainer {
    public Container: DependencyContainer = container;
}
