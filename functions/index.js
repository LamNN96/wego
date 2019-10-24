const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp(functions.config().firebase);

const db = admin.firestore();

///* Update profile picture */
const createProfile = (userRecord, context) => {
  const { email, phoneNumber, uid, providerData, displayName } = userRecord;
  let photoURL = userRecord.photoURL;
  if (providerData[0].providerId === "facebook.com") {
    photoURL = photoURL + "?height=200";
  }
  const user = admin.auth();
  const createUser = db
    .collection("users")
    .doc(uid)
    .set({
      name: displayName,
      is_first_time: true,
      uid,
      email,
      phone_number: phoneNumber,
      photo_url: photoURL
    })
    .catch(console.error);
  const updatePhotoUrl = user.updateUser(userRecord.uid, {
    photo_url: photoURL
  });
  return Promise.all([updatePhotoUrl, createUser])
    .then(() => {
      console.log("Create user");
      return;
    })
    .catch(err => {
      console.log("Error create user", err);
    });
};

//update user
const updateUser = (req, res) => {
  const user = req.body;
  return db
    .collection("users")
    .doc(user.uid)
    .update({
      name: user.name,
      photo_url: user.photo_url,
      phone_number: user.phone_number,
      is_first_time: false
    })
    .then(() => {
      console.log("Update user " + user.uid);
      res.status(200).send(user);
      return;
    })
    .catch(e => {
      res.status(500).send({});
      console.log("Update user error: ", e);
    });
};

const updateStatus = (req, res) => {
  const status = req.body.status;
  const uid = req.body.uid;
  return db
    .collection("users")
    .doc(uid) /*  */
    .update({
      status,
      time_stamp: admin.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
      console.log("Update status user " + uid + " to " + status);
      res.status(200).send(true);
      return;
    })
    .catch(e => {
      res.status(500).send(false);
      console.log("Update user error: ", e);
    });
};

// /* Create a new trip */
const createTrip = (req, res) => {
  let data = req.body;
  let code = data.code;
  const addTrip = db
    .collection("trips")
    .doc(code)
    .set(data)
    .then(() => {
      return;
    })
    .catch(err => {
      console.log("err", err);
    });
  const addActiveTrip = db
    .collection("users")
    .doc(data.creator_id)
    .update({
      active_trip: data.code,
      my_trips: admin.firestore.FieldValue.arrayUnion(data.code)
    })
    .then(() => {
      return;
    })
    .catch(err => {
      console.log("err", err);
    });
  return Promise.all([addTrip, addActiveTrip])
    .then(() => {
      console.log("Created trip with code: ", data.code);
      res.status(200).send(data);
      return;
    })
    .catch(err => {
      console.log("all err", err);
    });
};

// get my trips
const getMyTrips = (req, res) => {
  const uid = req.body.uid;
  let promises = [];
  let usersRef = db.collection("users").doc(uid);
  return usersRef
    .get()
    .then(doc => {
      if (doc.exists) {
        const user = doc.data();
        let myTrips = [];
        if (user.my_trips) {
          myTrips = user.my_trips;
          myTrips.forEach(tripCode => {
            console.log("object", tripCode);
            const p = db
              .collection("trips")
              .doc(tripCode)
              .get();
            promises.push(p);
          });
        }
      } else {
        console.log("No such doc");
      }
      return Promise.all(promises);
    })
    .then(tripSnapshots => {
      let results = [];
      tripSnapshots.forEach(tripSnap => {
        if (tripSnap.exists) {
          results.push(tripSnap.data());
        }
      });
      console.log("My trips", results);
      res.status(200).send(results);
      console.log("No such trip doc");
      return;
    })
    .catch(e => {
      console.log("Error when get my trips ", e);
    });
};

//get list members
const getListMember = (req, res) => {
  const code = req.body.active_trip;
  let tripsRef = db.collection("trips").doc(code);
  let promises = [];
  return tripsRef
    .get()
    .then(doc => {
      if (doc.exists) {
        const members = doc.data().members;
        members.forEach(uid => {
          const p = db
            .collection("users")
            .doc(uid)
            .get();
          promises.push(p);
        });
      } else {
        console.log("No member");
      }
      return Promise.all(promises);
    })
    .then(userSnapshots => {
      let results = [];
      userSnapshots.forEach(userSnap => {
        if (userSnap.exists) {
          results.push(userSnap.data());
        } else {
          console.log("No such document!");
        }
      });
      console.log("res", results);
      res.status(200).send(results);
      return;
    })
    .catch(err => {
      console.log("get list members err", err);
    });
};

//get trip by code
const getTrip = (req, res) => {
  const code = req.body.active_trip;
  console.log(req.body);
  return db
    .collection("trips")
    .doc(code)
    .get()
    .then(doc => {
      if (doc.exists) {
        const data = doc.data();
        res.status(200).send(data);
      } else {
        console.log("No such doccument");
        res.status(404).send({});
      }
      return;
    })
    .catch(e => {
      console.log(e);
    });
};

///* Update location */
const updateLocation = (req, res) => {
  let data = req.body;
  let promises = [];
  /* active_trip: 'as',
  location: { lat: 20.963739341813092, lng: 105.76690766775546 },
  photo_url: 'https://graph.facebook.com/1991011394332580/picture?height=200',
  uid: 'GbrbYtIHWcN9fyszrFUkj45qvEz2' */
  let usersRef = db.collection("users").doc(data.uid);
  let tripsRef = db.collection("trips").doc(data.active_trip);
  return usersRef
    .update({
      location: data.location
    })
    .then(() => {
      tripsRef
        .get()
        .then(doc => {
          if (doc.exists) {
            const members = doc.data().members;
            members.forEach(uid => {
              const p = db
                .collection("users")
                .doc(uid)
                .get();
              promises.push(p);
            });
          } else {
            console.log("No member");
          }
          return Promise.all(promises);
        })
        .then(userSnapshots => {
          let results = [];
          userSnapshots.forEach(userSnap => {
            if (userSnap.exists) {
              results.push(userSnap.data());
            } else {
              console.log("No such document!");
            }
          });
          res.status(200).send(results);
          return;
        })
        .catch(err => {
          console.log("get list members err", err);
        });
      return;
    })
    .catch(err => {
      console.log("err", err);
    });
};

// /* Join trip */
const joinTrip = (req, res) => {
  const user = req.body;
  const code = user.active_trip;
  let tripsRef = db.collection("trips").doc(code);
  let userRef = db.collection("users").doc(user.uid);
  return tripsRef
    .update({
      members: admin.firestore.FieldValue.arrayUnion(user.uid)
    })
    .then(() => {
      console.log("added member");
      userRef
        .update({
          active_trip: code,
          my_trips: admin.firestore.FieldValue.arrayUnion(code)
        })
        .then(snapshot => {
          return user;
        })
        .catch(err => {
          console.log("err", err);
          res.status(404).send(false);
        });
      res.status(200).send(true);
      return;
    })
    .catch(err => {
      res.status(404).send(false);
      console.log("err", err);
    });
};

const switchTrip = (req, res) => {
  const user = req.body;
  const active_trip = user.active_trip;
  const uid = user.uid;
  return db
    .collection("users")
    .doc(uid)
    .update({
      active_trip
    })
    .then(() => {
      console.log("Switch to " + active_trip);
      res.status(200).send(user);
      return;
    })
    .catch(e => {
      res.status(404).send({});
      console.log("err" + e);
    });
};

const onWriteEvent = (change, context) => {
  console.log(context.params);
  console.log(change.after.data());
  const dataChanged = change.after.data();
  let topic = "car";
  let payload = {
    data: {
      name: dataChanged.user.name,
      type: dataChanged.type
    }
  };
  return admin
    .messaging()
    .sendToTopic(topic, payload)
    .then(response => {
      console.log("Send ok", response);
      return;
    })
    .catch(e => {
      console.log(e);
    });
};

const createEvent = (req, res) => {
  let event = req.body;
  event.time_stamp = admin.firestore.FieldValue.serverTimestamp();
  return db
    .collection("events")
    .doc()
    .set(event)
    .then(() => {
      console.log("Created event ", event.type);
      res.status(200).send(event);
      return;
    })
    .catch(e => {
      res.status(404).send({});
      console.log(e);
    });
};

const outTrip = (req, res) => {
  let user = req.body;
  let { uid, active_trip, status: thisTrip } = user;
  if (active_trip === thisTrip) {
    active_trip = "";
  }
  const removeMyTrip = db
    .collection("users")
    .doc(uid)
    .update({
      active_trip,
      my_trips: admin.firestore.FieldValue.arrayRemove(thisTrip)
    })
    .then(() => {
      console.log("Updated my trips");
      return;
    })
    .catch(e => {
      console.log("Remove my trips", e);
    });

  const updateThisTrip = db
    .collection("trips")
    .doc(thisTrip)
    .update({
      members: admin.firestore.FieldValue.arrayRemove(uid)
    })
    .then(() => {
      console.log("Updated this trip");
      return;
    })
    .catch(e => {
      console.log("update this trip err", e);
    });

  return Promise.all([removeMyTrip, updateThisTrip])
    .then(() => {
      console.log(uid, " out ", thisTrip);
      res.status(200).send(true);
      return;
    })
    .catch(e => {
      console.log("update this trip err", e);
      res.status(404).send(false);
    });
};

const updateTrip = (req, res) => {
  const trip = req.body;
  return db
    .collection("trips")
    .doc(trip.code)
    .update(trip)
    .then(() => {
      console.log("Update trip to " + trip.name);
      res.status(200).send(trip);
      return;
    })
    .catch(e => {
      console.log(e);
      res.status(404).send({});
    });
};

const getAllEvent = (req, res) => {
  const user = req.body;
  const { active_trip, uid } = user;
  let results = [];
  return db
    .collection("events")
    .where("trip_id", "==", active_trip)
    .where("user_id", "==", uid)
    .get()
    .then(userSnap => {
      if (userSnap.empty) {
        console.log("No matching documents.");
        return;
      }

      userSnap.forEach(doc => {
        console.log(doc.id, "=>", doc.data());
        results.push(doc.data());
      });
      res.status(200).send(results);
      return;
    })
    .catch(e => {
      console.log(e);
      res.status(404).send({});
    });
};

module.exports = {
  authOnCreate: functions.auth.user().onCreate(createProfile),
  createTrip: functions.https.onRequest(createTrip),
  updateLocation: functions.https.onRequest(updateLocation),
  joinTrip: functions.https.onRequest(joinTrip),
  getMyTrips: functions.https.onRequest(getMyTrips),
  getTrip: functions.https.onRequest(getTrip),
  updateUser: functions.https.onRequest(updateUser),
  updateStatus: functions.https.onRequest(updateStatus),
  getListMember: functions.https.onRequest(getListMember),
  switchTrip: functions.https.onRequest(switchTrip),
  createEvent: functions.https.onRequest(createEvent),
  updateTrip: functions.https.onRequest(updateTrip),
  outTrip: functions.https.onRequest(outTrip),
  getAllEvent: functions.https.onRequest(getAllEvent),
  onWriteEvent: functions.firestore
    .document("events/{eventId}")
    .onWrite(onWriteEvent)
};
