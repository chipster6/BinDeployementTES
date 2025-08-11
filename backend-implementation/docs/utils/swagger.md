# Documentation for `utils/swagger.ts`

## Overview

This file is responsible for setting up and serving the Swagger UI for the API documentation. It loads the OpenAPI specification from the `artifacts/api-contracts.yml` file and uses `swagger-ui-express` to create an interactive API documentation page.

## Key Features

-   **Interactive Documentation**: Serves a user-friendly, interactive API documentation page.
-   **Contract-driven**: Loads the API specification from the `api-contracts.yml` file, ensuring that the documentation is consistent with the design.
-   **Customization**: Includes custom CSS and options to improve the look and feel of the Swagger UI.
-   **Multiple Formats**: Serves the OpenAPI specification in both JSON and YAML formats.

## Functions

### `setupSwagger(app: Express): void`

Sets up the Swagger UI and mounts it on the `/api/docs` endpoint of the Express application.

-   **`app`**: An instance of the Express application.

### `generateSwaggerFromJSDoc(): any`

An alternative method for generating the OpenAPI specification from JSDoc comments in the source code.

### `validateOpenAPISpec(spec: any): boolean`

Performs a basic validation of the OpenAPI specification.
