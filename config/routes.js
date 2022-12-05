module.exports.routes = {
  "POST /messages/sendEmail": {
    controller: "MessagesController",
    action: "sendEmail",
  },

  "GET /terms/student": {
    controller: "TermsController",
    action: "student",
  },

  "GET /dashboards/student": {
    controller: "DashboardsController",
    action: "student",
  },
  "GET /dashboards/instructor": {
    controller: "DashboardsController",
    action: "instructor",
  },
  "GET /dashboards/admin": {
    controller: "DashboardsController",
    action: "admin",
  },
  "GET /dashboards/parent": {
    controller: "DashboardsController",
    action: "parent",
  },

  "GET /chats/getActiveChats": {
    controller: "ChatsController",
    action: "getActiveChats",
  },
  "GET /chats/joinChat/:chatId": {
    controller: "ChatsController",
    action: "joinChat",
  },
  "GET /chats/leaveChat/:chatId": {
    controller: "ChatsController",
    action: "leaveChat",
  },
  "GET /chats/rejectInvite/:chatId": {
    controller: "ChatsController",
    action: "rejectInvite",
  },
  "POST /chats/inviteToJoin": {
    controller: "ChatsController",
    action: "inviteToJoin",
  },

  "POST /chats/message": {
    controller: "ChatsController",
    action: "postMessage",
  },
  "PUT /chats/message": {
    controller: "ChatsController",
    action: "editMessage",
  },
  "PUT /chats/:force": {
    controller: "ChatsController",
    action: "update",
  },
  "DELETE /chats/message/:messageId": {
    controller: "ChatsController",
    action: "deleteMessage",
  },
  "DELETE /chats/message/:messageId/:force": {
    controller: "ChatsController",
    action: "deleteMessage",
  },

  "GET /chats/chatsChannel/:chatId/:action": {
    controller: "ChatsController",
    action: "chatsChannel",
  },

  "GET /catalogues": {
    controller: "CataloguesController",
    action: "list",
  },
  "GET /catalogues/general": {
    controller: "CataloguesController",
    action: "listGeneral",
  },
  "GET /catalogues/general/:catalogueId": {
    controller: "CataloguesController",
    action: "getGeneralById",
  },
  "GET /catalogues/student": {
    controller: "CataloguesController",
    action: "listStudent",
  },
  "POST /catalogues": {
    controller: "CataloguesController",
    action: "create",
  },
  "PUT /catalogues": {
    controller: "CataloguesController",
    action: "update",
  },
  "PUT /catalogues/:force": {
    controller: "CataloguesController",
    action: "update",
  },
  "GET /catalogues/:catalogueId": {
    controller: "CataloguesController",
    action: "getById",
  },
  "POST /catalogues/delete": {
    controller: "CataloguesController",
    action: "delete",
  },
  "DELETE /catalogues/:catalogueId/:force": {
    controller: "CataloguesController",
    action: "delete",
  },

  "GET /assignments": {
    controller: "AssignmentsController",
    action: "list",
  },
  "GET /assignments/:query": {
    controller: "AssignmentsController",
    action: "list",
  },
  "POST /assignments": {
    controller: "AssignmentsController",
    action: "create",
  },
  "PUT /assignments": {
    controller: "AssignmentsController",
    action: "update",
  },
  "PUT /assignments/:force": {
    controller: "AssignmentsController",
    action: "update",
  },
  "DELETE /assignments/:assignmentId": {
    controller: "AssignmentsController",
    action: "delete",
  },
  "DELETE /assignments/:assignmentId/:force": {
    controller: "AssignmentsController",
    action: "delete",
  },

  "GET /plans": {
    controller: "PlansController",
    action: "list",
  },
  "GET /plans/:query": {
    controller: "PlansController",
    action: "list",
  },
  "POST /plans": {
    controller: "PlansController",
    action: "create",
  },
  "PUT /plans": {
    controller: "PlansController",
    action: "update",
  },
  "PUT /plans/:force": {
    controller: "PlansController",
    action: "update",
  },
  "DELETE /plans/:planId": {
    controller: "PlansController",
    action: "delete",
  },
  "DELETE /plans/:planId/:force": {
    controller: "PlansController",
    action: "delete",
  },

  "GET /disciplines": {
    controller: "DisciplinesController",
    action: "list",
  },
  "GET /disciplines/:query": {
    controller: "DisciplinesController",
    action: "list",
  },
  "POST /disciplines": {
    controller: "DisciplinesController",
    action: "create",
  },
  "PUT /disciplines": {
    controller: "DisciplinesController",
    action: "update",
  },
  "PUT /disciplines/:force": {
    controller: "DisciplinesController",
    action: "update",
  },
  "DELETE /disciplines/:disciplineId": {
    controller: "DisciplinesController",
    action: "delete",
  },
  "DELETE /disciplines/:disciplineId/:force": {
    controller: "DisciplinesController",
    action: "delete",
  },

  "GET /groups": {
    controller: "GroupsController",
    action: "list",
  },
  "GET /groups/:query": {
    controller: "GroupsController",
    action: "list",
  },
  "POST /groups": {
    controller: "GroupsController",
    action: "create",
  },
  "PUT /groups": {
    controller: "GroupsController",
    action: "update",
  },
  "PUT /groups/:force": {
    controller: "GroupsController",
    action: "update",
  },
  "DELETE /groups/:groupId": {
    controller: "GroupsController",
    action: "delete",
  },
  "DELETE /groups/:groupId/:force": {
    controller: "GroupsController",
    action: "delete",
  },

  "GET /courses": {
    controller: "CoursesController",
    action: "list",
  },
  "GET /courses/:query": {
    controller: "CoursesController",
    action: "list",
  },
  "POST /courses": {
    controller: "CoursesController",
    action: "create",
  },
  "PUT /courses": {
    controller: "CoursesController",
    action: "update",
  },
  "PUT /courses/:force": {
    controller: "CoursesController",
    action: "update",
  },
  "DELETE /courses/:courseId": {
    controller: "CoursesController",
    action: "delete",
  },
  "DELETE /courses/:courseId/:force": {
    controller: "CoursesController",
    action: "delete",
  },

  "GET /departments": {
    controller: "DepartmentsController",
    action: "list",
  },
  "GET /departments/:query": {
    controller: "DepartmentsController",
    action: "list",
  },
  "POST /departments": {
    controller: "DepartmentsController",
    action: "create",
  },
  "PUT /departments": {
    controller: "DepartmentsController",
    action: "update",
  },
  "PUT /departments/:force": {
    controller: "DepartmentsController",
    action: "update",
  },
  "DELETE /departments/:departmentId": {
    controller: "DepartmentsController",
    action: "delete",
  },
  "DELETE /departments/:departmentId/:force": {
    controller: "DepartmentsController",
    action: "delete",
  },

  "GET /faculties": {
    controller: "FacultiesController",
    action: "list",
  },
  "GET /faculties/:query": {
    controller: "FacultiesController",
    action: "list",
  },
  "POST /faculties": {
    controller: "FacultiesController",
    action: "create",
  },
  "PUT /faculties": {
    controller: "FacultiesController",
    action: "update",
  },
  "PUT /faculties/:force": {
    controller: "FacultiesController",
    action: "update",
  },
  "DELETE /faculties/:facultyId": {
    controller: "FacultiesController",
    action: "delete",
  },
  "DELETE /faculties/:facultyId/:force": {
    controller: "FacultiesController",
    action: "delete",
  },

  "GET /events": {
    controller: "EventsController",
    action: "list",
  },
  "GET /events/:query": {
    controller: "EventsController",
    action: "list",
  },
  "POST /events": {
    controller: "EventsController",
    action: "create",
  },
  "PUT /events": {
    controller: "EventsController",
    action: "update",
  },
  "PUT /events/:force": {
    controller: "EventsController",
    action: "update",
  },
  "DELETE /events/:eventId": {
    controller: "EventsController",
    action: "delete",
  },
  "DELETE /events/:eventId/:force": {
    controller: "EventsController",
    action: "delete",
  },

  "POST /preferences": {
    controller: "PreferencesController",
    action: "update",
  },
  "POST /preferences/requestPasswordResetFromConsole": {
    controller: "PreferencesController",
    action: "requestPasswordResetFromConsole",
  },

  "GET /institutions": {
    controller: "InstitutionsController",
    action: "list",
  },
  "GET /institutions/:query": {
    controller: "InstitutionsController",
    action: "list",
  },
  "POST /institutions": {
    controller: "InstitutionsController",
    action: "create",
  },
  "PUT /institutions": {
    controller: "InstitutionsController",
    action: "update",
  },
  "PUT /institutions/:force": {
    controller: "InstitutionsController",
    action: "update",
  },
  "DELETE /institutions/:institutionId": {
    controller: "InstitutionsController",
    action: "delete",
  },
  "DELETE /institutions/:institutionId/:force": {
    controller: "InstitutionsController",
    action: "delete",
  },

  "GET /accounts": {
    controller: "AccountsController",
    action: "list",
  },
  "GET /accounts/:query": {
    controller: "AccountsController",
    action: "list",
  },
  "POST /accounts": {
    controller: "AccountsController",
    action: "create",
  },
  "POST /accounts/staff": {
    controller: "AccountsController",
    action: "createStaffMass",
  },
  "POST /accounts/student": {
    controller: "AccountsController",
    action: "createStudentsMass",
  },
  "PUT /accounts": {
    controller: "AccountsController",
    action: "update",
  },
  "PUT /accounts/:force": {
    controller: "AccountsController",
    action: "update",
  },
  "DELETE /accounts/:accountId": {
    controller: "AccountsController",
    action: "delete",
  },
  "DELETE /accounts/:accountId/:force": {
    controller: "AccountsController",
    action: "delete",
  },

  "GET /invites": {
    controller: "InvitesController",
    action: "list",
  },
  "GET /invites/:query": {
    controller: "InvitesController",
    action: "list",
  },
  "POST /invites": {
    controller: "InvitesController",
    action: "create",
  },
  "PUT /invites": {
    controller: "InvitesController",
    action: "update",
  },
  "PUT /invites/:force": {
    controller: "InvitesController",
    action: "update",
  },
  "DELETE /invites/:inviteId": {
    controller: "InvitesController",
    action: "delete",
  },
  "DELETE /invites/:inviteId/:force": {
    controller: "InvitesController",
    action: "delete",
  },

  "GET /bootstrapDemo": {
    controller: "UtilsController",
    action: "bootstrapDemo",
  },
  "GET /getDate": {
    controller: "UtilsController",
    action: "getDate",
  },
  "GET /session": {
    controller: "UtilsController",
    action: "returnSession",
  },
  "GET /systemUpdatesChannel/:action": {
    controller: "UtilsController",
    action: "systemUpdatesChannel",
  },
  "POST /login": {
    controller: "UtilsController",
    action: "login",
  },
  "POST /loginByPhone": {
    controller: "UtilsController",
    action: "loginByPhone",
  },
  "POST /logout": {
    controller: "UtilsController",
    action: "logout",
  },
  "POST /reset-password": {
    controller: "UtilsController",
    action: "resetPassword",
  },
  "POST /password-reset": {
    controller: "UtilsController",
    action: "passwordReset",
  },
  "GET /signStorageUrl/:filePathName": {
    controller: "UtilsController",
    action: "signStorageUrl",
  },
  "GET /statistics/student": {
    controller: "StatisticsController",
    action: "listForStudent",
  },
  "GET /statistics/parent": {
    controller: "StatisticsController",
    action: "listForParent",
  },
  "GET /statistics/admin": {
    controller: "StatisticsController",
    action: "listForAdmin",
  },

  "POST /common/accounts-list": {
    controller: "CommonController",
    action: "listAccountsById",
  },
  "POST /common/instructs-list": {
    controller: "CommonController",
    action: "listDisciplines",
  },
  "POST /assignments/general": {
    controller: "CommonController",
    action: "listGeneral",
  },
  "GET /plans/get/:facultyId/:departmentId": {
    controller: "CommonController",
    action: "listByFacultyAndDepartment",
  },
  "GET /plans/disciplines/:planId": {
    controller: "CommonController",
    action: "listDisciplinesByPlanId",
  },

  "/*": {
    skipAssets: true,
    view: "index",
  },
};
