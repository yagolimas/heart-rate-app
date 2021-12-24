# Expo

## Criando projeto React Native com Expo

```bash
expo init name-app
```

## Instalando as depend�ncias do ble-px atrav�s do Expo

```bash
expo add react-native-ble-plx @config-plugins/react-native-ble-plx expo-dev-client

```

Adicionar o @config-plugins/react-native-ble-plx no app.json.

~~~json
"plugins": ["@config-plugins/react-native-ble-plx"]
~~~

## Executando atrav�s do Expo

```bash
expo start
```

## Executa e limpa o cache do Expo

```bash
expo r -c
```

## Executa utilizando o tunnel

```bash
expo start --tunnel
```

### Executa local no Android atrav�s do Expo Go

```bash
expo start --localhost --android
```

### Executa o bin�rio do Android de forma local

```bash
expo run:android
```

### Executa o bin�rio do Android local para um device (**-d**)  especifico

```bash
expo run:android -d
```
