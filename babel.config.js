/**
 * Babel-Konfiguration.
 *
 * Das Worklets-Plugin gehört ans Ende der Liste — es muss nach allen anderen
 * Umschreibungen laufen, sonst findet Reanimated seine Animationsfunktionen
 * nicht und die Oberfläche bleibt stumm.
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-worklets/plugin'],
  };
};
