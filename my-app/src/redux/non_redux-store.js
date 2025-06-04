import dialogReducer from "./dialogs_reducer"
import profileReducer from "./postsSlice"
import sidebarReducer from "./sidebar_reducer"


let store = {
  _state: {
    profilePage: {
      postData: [
        { id: 1, message: "Hi, how are you", likeCount: 11 },
        { id: 2, message: "U win", likeCount: 7 },
        { id: 3, message: "Bazzzzila", likeCount: 30 },
        { id: 4, message: "ggra", likeCount: 1002 },
      ],
      newPostText: "GAMMA",
    },
    dialogPage: {
      dialogs: [
        { id: "1", name: "Random" },
        { id: "2", name: "Random2" },
        { id: "3", name: "Random3" },
        { id: "4", name: "Random4" },
        { id: "5", name: "Random5" },
      ],
      messages: [
        { id: "1", message: "HI" },
        { id: "2", message: "AGAGAGAGAGAG" },
        { id: "3", message: "gideon" },
        { id: "4", message: "GUI" },
        { id: "5", message: "GG" },
      ],
      newMessageText: "",
    },
    sidebar: {},
  },
  _callSubscriber() {
    console.log("No observer function has been set.")
  },
  getState() {
    return this._state
  },
  subscribe(observer) {
    this._callSubscriber = observer // Зберігаємо функцію для подальшого виклику
  },
  dispatch(action) {
    this._state.profilePage = profileReducer(this._state.profilePage ,action);
    this._state.dialogPage = dialogReducer(this._state.dialogPage, action);
    this._state.sidebar = sidebarReducer(this._state.sidebar, action);
    this._callSubscriber()
  },
}


// export default store
