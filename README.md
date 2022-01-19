# Expo

### Criando projeto React Native com Expo

```bash
expo init name-app
```

### Instalando as dependências do ble-px através do Expo

```bash
expo add react-native-ble-plx @config-plugins/react-native-ble-plx expo-dev-client

```

Adicionar o @config-plugins/react-native-ble-plx no app.json.

~~~json
"plugins": ["@config-plugins/react-native-ble-plx"]
~~~

### Executando através do Expo

```bash
expo start
```

### Executa utilizando o tunnel

```bash
expo start --tunnel
```

### Executa o binário do Android local para um device (**-d**)  especifico

```bash
expo run:android -d
```
