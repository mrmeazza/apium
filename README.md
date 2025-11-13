

# Apium

**Apium** is an interactive CLI tool for exploring OpenAPI 3 specifications directly from your terminal. It allows you to navigate endpoints, view detailed parameter and response information, resolve `$ref` schemas, and filter by HTTP methods, all with a color-coded, user-friendly interface.

---

## Features

- **Interactive navigation:** Use arrow keys to scroll through endpoints and switch between HTTP methods.
- **Detailed endpoint view:** See parameters, types, enums, nested schemas, `$ref` resolution, responses, and tags.
- **Color-coded interface:** HTTP methods and response codes are highlighted for readability.
- **Full OpenAPI 3 support:** Works with arrays, objects, enums, and `$ref` references.
- **Minimal and fast:** Runs entirely in your terminal without a web interface.

---

## Installation

```bash
npm install -g apium
```

## Usage

```bash
cat openapi.yaml | apium
 ```

```bash
apium < openapi.yaml
```

```bash
curl -s https://example.com/openapi.yaml | apium 
```

## TODO Features

- [ ] Parser improvements
- [ ] Add a search/filter feature for endpoint names and tags
- [ ] Support for rendering request bodies with examples in the details view
- [ ] Collapsible sections for nested schemas and array types
- [ ] Interactive tabs for responses by status code
- [ ] Auto-detect $ref circular references to avoid infinite loops
- [ ] Integrate with live API servers to send test requests
