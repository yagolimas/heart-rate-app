import React, { Component } from 'react'
import {
  Modal,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Animated,
  TextInput,
} from 'react-native'

import {
  BleError,
  BleManager,
  Characteristic,
  Device,
  DeviceId,
} from 'react-native-ble-plx'

import base64 from 'react-native-base64'

import Svg, { Circle } from 'react-native-svg'

import IconNextSvg from './assets/next.svg'
import IconPauseSvg from './assets/pause.svg'
import IconDiagramSvg from './assets/diagram.svg'
import IconBluetoothSvg from './assets/bluetooth.svg'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput)

const MIN = 75
const MAX = 100

const manager = new BleManager()

interface IState {
  modalVisible: boolean
  devices: Array<Device>
  deviceId: DeviceId
  deviceIsConnected: boolean
}

export default class App extends Component {
  state = {
    modalVisible: false,
    devices: [],
    deviceId: '',
    deviceIsConnected: false,
  } as IState
  circleRadius = new Animated.Value(MIN)
  circleRef: any
  inputRef: any
  intervalId: any

  constructor(props: any) {
    super(props)
  }

  openModal() {
    this.setModalVisible(true)
    this.loadingDevices()
  }

  loadingDevices() {
    const subscription = manager.onStateChange((state) => {
      if (state === 'PoweredOn') {
        this.scanDevices()
        subscription.remove()
      }
    }, true)
  }

  scanDevices() {
    const devices = new Set()

    manager.startDeviceScan(
      ['0000180d-0000-1000-8000-00805f9b34fb'],
      null,
      async (error, device) => {
        if (error) {
          console.log('Error: ', error.message)
          return
        }
        if (Boolean(device?.name)) {
          devices.add(device)
          this.setState({ devices: [...devices], deviceId: device?.id })
          manager.stopDeviceScan()
        }
      }
    )
  }

  selectDevice(selectedDevice: Device) {
    selectedDevice
      .connect()
      .then((device: Device) => {
        console.log('Connection available with: ', device.name)
        this.setState({ deviceIsConnected: true })
        return device.discoverAllServicesAndCharacteristics()
      })
      .then((device: Device) => {
        this.setModalVisible(false)
        this.readingDeviceData(device)
        this.startAnimation()
      })
      .catch((error) => {
        console.log('Connection failed: ', error)
      })
  }

  readingDeviceData(device: Device) {
    const heartRateServiceUUID = '0000180D-0000-1000-8000-00805F9B34FB'
    const heartRateCharacteristicUUID = '00002A37-0000-1000-8000-00805F9B34FB'

    const subscription = device.monitorCharacteristicForService(
      heartRateServiceUUID,
      heartRateCharacteristicUUID,
      (error: BleError | null, charac: Characteristic | null) => {
        if (error) {
          console.log('Monitor fail:', error.message)
          subscription.remove()
          return
        }
        const heartRate = this.decodeHeartRate(charac?.value!)
        this.inputRef?.setNativeProps({
          text: `${heartRate}`,
        })
      },
      'monitor'
    )
  }

  decodeHeartRate(value: string) {
    const data: any = base64.decode(value)
    const firstBitValue: number = data[0] & 0x01
    if (firstBitValue === 0) {
      return data[1].charCodeAt(0)
    }
    return Number(data[1].charCodeAt(0) << 8) + Number(data[2].charCodeAt(2))
  }

  startAnimation() {
    if (!this.intervalId) {
      this.circleRadius.addListener((circleRadius) => {
        this.circleRef?.setNativeProps({ r: circleRadius.value.toString() })
      })
      this.intervalId = setInterval(() => {
        Animated.sequence([
          Animated.timing(this.circleRadius, {
            toValue: MIN,
            duration: 200,
            useNativeDriver: false,
          }),
          Animated.spring(this.circleRadius, {
            toValue: MAX,
            friction: 2.5,
            useNativeDriver: false,
          }),
        ]).start()
      }, 1000)
    }
  }

  stopAnimation() {
    Animated.sequence([
      Animated.timing(this.circleRadius, {
        toValue: 0,
        useNativeDriver: false,
      }),
      Animated.spring(this.circleRadius, {
        toValue: 0,
        useNativeDriver: false,
      }),
    ]).stop()
  }

  setModalVisible(visible: boolean) {
    this.setState({ modalVisible: visible })
  }

  start() {
    const { deviceId, deviceIsConnected } = this.state
    if (deviceId && !deviceIsConnected) {
      manager
        .connectToDevice(deviceId)
        .then((device) => {
          console.log('Connection available with: ', device.name)
          this.setState({ deviceIsConnected: true })
          return device.discoverAllServicesAndCharacteristics()
        })
        .then((device: Device) => {
          this.readingDeviceData(device)
          this.startAnimation()
        })
        .catch((error) => {
          console.log('Connection failed to start: ', error)
        })
    }
  }

  pause() {
    const { deviceId, deviceIsConnected } = this.state
    if (deviceId && deviceIsConnected) {
      manager
        .cancelDeviceConnection(deviceId)
        .then((device: Device) => {
          this.setState({ deviceIsConnected: false })
          console.log(`Device ${device.name} desconnected`)
        })
        .catch((error) => {
          console.log('Failed to pause connection: ', error)
        })
      clearInterval(this.intervalId)
      this.intervalId = null
      this.stopAnimation()
    }
  }

  componentWillUnmount() {
    manager
      .cancelDeviceConnection(this.state.deviceId)
      .then((device: Device) => {
        console.log(`Device ${device.name} desconnected`)
      })
      .catch((error) => {
        console.log('Failed to terminate: ', error)
      })
  }

  render() {
    const { modalVisible, devices }: IState = this.state

    return (
      <View style={styles.container}>
        <Modal
          animationType='fade'
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => {
            this.setModalVisible(!modalVisible)
          }}
        >
          <View style={styles.modalBackground}>
            <View style={styles.modalContainer}>
              <Text style={styles.textTitleModal}>
                Choose your bluetooth device:
              </Text>
              <FlatList
                data={devices}
                renderItem={({ item: device }) => (
                  <TouchableOpacity
                    style={styles.textDeviceModal}
                    onPress={() => {
                      this.selectDevice(device)
                    }}
                  >
                    <Text style={styles.textDeviceModal}>
                      {device.localName}
                    </Text>
                  </TouchableOpacity>
                )}
              />
              <TouchableOpacity
                style={styles.btnClose}
                onPress={() => {
                  this.setModalVisible(!modalVisible)
                }}
              >
                <Text style={{ color: '#fff' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        <View style={styles.circleAnimation}>
          <Svg height={680} width={400}>
            <AnimatedCircle
              ref={(ref: any) => (this.circleRef = ref)}
              cx={400 / 2}
              cy={680 / 2}
              r={MIN}
              fill='#FF5757'
            />
          </Svg>
          <AnimatedTextInput
            ref={(ref: any) => (this.inputRef = ref)}
            underlineColorAndroid='transparent'
            editable={false}
            defaultValue='0'
            style={[
              StyleSheet.absoluteFillObject,
              { fontSize: 50, color: 'white' },
              { fontWeight: 'bold', textAlign: 'center' },
            ]}
          />
        </View>
        <View style={styles.menu}>
          <View style={styles.menuContainer}>
            <View style={styles.icon}>
              <TouchableOpacity onPress={() => this.openModal()}>
                <IconBluetoothSvg />
              </TouchableOpacity>
            </View>
            <View style={styles.icon}>
              <TouchableOpacity onPress={() => this.start()}>
                <IconNextSvg />
              </TouchableOpacity>
            </View>
            <View style={styles.icon}>
              <TouchableOpacity onPress={() => this.pause()}>
                <IconPauseSvg />
              </TouchableOpacity>
            </View>
            <View style={styles.icon}>
              <TouchableOpacity>
                <IconDiagramSvg />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#17194a',
  },
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: '#1f2058',
    paddingHorizontal: 20,
    paddingVertical: 30,
    borderRadius: 20,
    elevation: 20,
  },
  textTitleModal: {
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 18,
    color: '#fff',
  },
  textDeviceModal: {
    marginTop: 10,
    color: '#fff',
  },
  textBtnOpen: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  circleAnimation: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  menu: {
    paddingHorizontal: 50,
    paddingBottom: 50,
  },
  menuContainer: {
    width: '100%',
    height: 70,
    backgroundColor: '#493dbb',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnClose: {
    width: '100%',
    height: 35,
    borderRadius: 50,
    backgroundColor: '#493dbb',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
  },
  icon: {
    width: 80,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
