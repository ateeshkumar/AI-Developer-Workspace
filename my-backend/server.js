require("dotenv").config();
const http = require("http");

const app = require("./src/app");
const CollaborationGateway = require("./src/gateways/collaboration.gateway");
const {
  setCollaborationGateway,
} = require("./src/services/collaboration.service");

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
const collaborationGateway = new CollaborationGateway(server);

setCollaborationGateway(collaborationGateway);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
