/*
<file name=cli.ts>import { ApiumParserService } from "./apium-parser-service";

class ApiumShell {
  constructor(private endpoints: any[]) {
    this.tags = ["All"];
    this.endpoints.forEach((endpoint) => {
      const endpointTags = endpoint.tags || ["Untagged"];
      endpointTags.forEach((tag) => {
        if (!this.tags.includes(tag)) {
          this.tags.push(tag);
        }
      });
    });
    this.currentTagIndex = 0;
    this.currentEndpointIndex = 0;
  }

  tags: string[];
  currentTagIndex: number;
  currentEndpointIndex: number;

  renderTabs() {
    return this.tags
      .map((tag, index) => {
        const isActive = index === this.currentTagIndex;
        return isActive ? `[${tag}]` : tag;
      })
      .join(" ");
  }

  renderEndpoints() {
    const currentTag = this.tags[this.currentTagIndex];
    const filteredEndpoints =
      currentTag === "All"
        ? this.endpoints
        : this.endpoints.filter((ep) => (ep.tags || ["Untagged"]).includes(currentTag));

    return filteredEndpoints
      .map((endpoint, index) => {
        const isActive = index === this.currentEndpointIndex;
        return isActive ? `> ${endpoint.path}` : `  ${endpoint.path}`;
      })
      .join("\n");
  }

  handleKey(key: string) {
    if (key === "ArrowRight") {
      this.currentTagIndex = (this.currentTagIndex + 1) % this.tags.length;
      this.currentEndpointIndex = 0;
    } else if (key === "ArrowLeft") {
      this.currentTagIndex =
        (this.currentTagIndex - 1 + this.tags.length) % this.tags.length;
      this.currentEndpointIndex = 0;
    } else if (key === "ArrowDown") {
      const currentTag = this.tags[this.currentTagIndex];
      const filteredEndpoints =
        currentTag === "All"
          ? this.endpoints
          : this.endpoints.filter((ep) => (ep.tags || ["Untagged"]).includes(currentTag));
      this.currentEndpointIndex =
        (this.currentEndpointIndex + 1) % filteredEndpoints.length;
    } else if (key === "ArrowUp") {
      const currentTag = this.tags[this.currentTagIndex];
      const filteredEndpoints =
        currentTag === "All"
          ? this.endpoints
          : this.endpoints.filter((ep) => (ep.tags || ["Untagged"]).includes(currentTag));
      this.currentEndpointIndex =
        (this.currentEndpointIndex - 1 + filteredEndpoints.length) % filteredEndpoints.length;
    }
  }

  renderFooter() {
    return "← → to switch tags, ↑ ↓ to navigate endpoints";
  }
}</file>
*/
