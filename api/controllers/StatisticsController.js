module.exports = {
  listForStudent: async (req, res) => {
    try {
      const locale = Locale("markers");
      const { authenticated } = req.session;
      const array = [];
      if (authenticated.profileType === "student") {
        const from = req.query.from;
        const to = req.query.to;
        const intFrom = from.toString();
        const intTo = to.toString();
        const studentData = [];
        const studentDates = [];
        const results = await Statistics.find({
          accountId: authenticated.accountId,
        }).sort("createdAt");
        for (result of results) {
          const hui = result.createdAt;
          const s = hui.toString();
          const h = Date.parse(s);
          if (intFrom <= h && h <= intTo) {
            const h = result.time / 1000 / 60;
            const data = {
              date: result.ymd,
              time: Math.round(h),
              type: result.type,
            };
            array.push(data);
          }
        }
        for (let c of array) {
          studentData.push(c.time);
          studentDates.push(c.date);
        }
        const finalStudent = {
          data: studentData,
          dates: studentDates,
          name: "students",
        };
        const newArr = [];
        newArr.push(finalStudent);
        return res.ok(true, newArr);
      } else return res.error();
    } catch (e) {
      return res.error(e);
    }
  },

  listForParent: async (req, res) => {
    try {
      const locale = Locale("markers");
      const { authenticated } = req.session;
      const array = [];
      if (authenticated.profileType === "parent") {
        const from = req.query.from;
        const to = req.query.to;
        const intFrom = from.toString();
        const intTo = to.toString();
        const studentData = [];
        const studentDates = [];
        const results = await Statistics.find({
          accountId: authenticated.additionalInfo.childAccountId,
        }).sort("createdAt");
        for (result of results) {
          const hui = result.createdAt;
          const s = hui.toString();
          const h = Date.parse(s);
          if (intFrom <= h && h <= intTo) {
            const h = result.time / 1000 / 60;
            const data = {
              date: result.ymd,
              time: Math.round(h),
              type: result.type,
            };
            array.push(data);
          }
        }
        for (let c of array) {
          studentData.push(c.time);
          studentDates.push(c.date);
        }
        const finalStudent = {
          data: studentData,
          dates: studentDates,
          name: "students",
        };
        const newArr = [];
        newArr.push(finalStudent);
        return res.ok(true, newArr);
      } else return res.error();
    } catch (e) {
      return res.error(e);
    }
  },

  listForAdmin: async (req, res) => {
    try {
      const { authenticated } = req.session;
      console.log(authenticated.profileType);

      if (authenticated.profileType === "idesAdmin") {
        const TeacherArray = [];
        const StudentArray = [];
        const teachers = await Statistics.find({ type: "2" }).sort("createdAt");
        const students = await Statistics.find({ type: "1" }).sort("createdAt");

        const from = req.query.from;
        const to = req.query.to;
        const intFrom = from.toString();
        const intTo = to.toString();

        for (teacher of teachers) {
          const hui = teacher.createdAt;
          const s = hui.toString();
          const h = Date.parse(s);
          if (intFrom <= h && h <= intTo) {
            const h = teacher.time / 1000 / 60;
            const data = {
              date: teacher.ymd,
              time: Math.round(h),
              type: teacher.type,
            };
            TeacherArray.push(data);
          }
        }
        for (student of students) {
          const hui = student.createdAt;
          const s = hui.toString();
          const h = Date.parse(s);
          if (intFrom <= h && h <= intTo) {
            const h = student.time / 1000 / 60;
            const data = {
              date: student.ymd,
              time: Math.round(h),
              type: student.type,
            };
            StudentArray.push(data);
          }
        }

        const newTeacherArr = [
          {
            teacher: TeacherArray,
          },
        ];
        const newStudentArr = [
          {
            student: StudentArray,
          },
        ];

        const teacher1 = newTeacherArr.map(function ({ teacher }) {
          return {
            teacher: Object.values(
              teacher.reduce(function (r, e) {
                if (!r[e.date]) r[e.date] = Object.assign({}, e);
                else r[e.date].time += e.time;
                return r;
              }, {})
            ),
          };
        });

        const student1 = newStudentArr.map(function ({ student }) {
          return {
            student: Object.values(
              student.reduce(function (r, e) {
                if (!r[e.date]) r[e.date] = Object.assign({}, e);
                else r[e.date].time += e.time;
                return r;
              }, {})
            ),
          };
        });
        const together = [];
        const teacherData = [];
        const teacherDates = [];
        const studentData = [];
        const studentDates = [];
        const reason = [];
        together.push(...teacher1, ...student1);
        for (let a of teacher1) {
          for (let b of a.teacher) {
            teacherData.push(b.time);
            teacherDates.push(b.date);
          }
        }
        for (let a of student1) {
          for (let c of a.student) {
            studentData.push(c.time);
            studentDates.push(c.date);
          }
        }
        const finalTeacher = {
          data: teacherData,
          dates: teacherDates,
          name: "teachers",
        };
        const finalStudent = {
          data: studentData,
          dates: studentDates,
          name: "students",
        };
        reason.push(finalTeacher, finalStudent);
        return res.ok(true, reason);
      } else return res.error();
    } catch (e) {
      return res.error(e);
    }
  },
};
