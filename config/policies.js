const idesAdmin = ["idesAdmin", "permissions", "dataResource"];
const schoolAdmin = ["schoolAdmin", "permissions", "dataResource"];
const regularSession = ["sessionAuth", "permissions", "dataResource"];

module.exports.policies = {
  UtilsController: {
    login: true,
    returnSession: true,
    requestPasswordResetLink: true,
    passwordReset: true,
    getDate: true,

    "*": "sessionAuth",
    bootstrapDemo: idesAdmin,
  },

  AccountsController: {
    "*": regularSession,
  },

  AssignmentsController: {
    "*": regularSession,
  },

  CataloguesController: {
    "*": regularSession,
  },

  ChatsController: {
    "*": regularSession,
  },

  CoursesController: {
    "*": regularSession,
  },

  DashboardsController: {
    "*": regularSession,
  },

  DepartmentsController: {
    "*": regularSession,
  },

  DisciplinesController: {
    "*": regularSession,
  },

  EventsController: {
    "*": regularSession,
  },

  FacultiesController: {
    "*": regularSession,
  },

  GroupsController: {
    "*": regularSession,
  },

  InstitutionsController: {
    "*": idesAdmin,
  },

  InvitesController: {
    "*": regularSession,
  },

  MessagesController: {
    "*": regularSession,
  },

  PlansController: {
    "*": regularSession,
  },

  PreferencesController: {
    "*": regularSession,
  },

  TermsController: {
    "*": regularSession,
  },
  StatisticsController: {
    "*": regularSession,
  },
};
