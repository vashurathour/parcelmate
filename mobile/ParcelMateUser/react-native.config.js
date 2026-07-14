module.exports = {
  project: {
    android: {},
    ios: {},
  },
  assets: ['./assets/fonts/'],
  dependencies: {
    'react-native-vector-icons': {
      platforms: {
        android: null, // handled by gradle
      },
    },
  },
};
