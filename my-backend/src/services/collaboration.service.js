let collaborationGateway = null;

const setCollaborationGateway = (gateway) => {
  collaborationGateway = gateway;
};

const getCollaborationGateway = () => collaborationGateway;

module.exports = {
  setCollaborationGateway,
  getCollaborationGateway,
};
