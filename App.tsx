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

import IconBluetoothSvg from './assets/bluetooth.svg'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput)

const MIN = 75
const MAX = 100

interface IState {
  modalVisible: boolean
  devices: Array<Device>
  deviceId: DeviceId
}

export default class App extends Component {
  manager: BleManager
  state = {
    modalVisible: false,
    devices: [],
    deviceId: '',
  } as IState
  circleRadius = new Animated.Value(MIN)
  circleRef: any
  inputRef: any

  constructor(props: any) {
    super(props)
    this.manager = new BleManager()
  }

  openModal() {
    this.setModalVisible(true)
    this.loadingDevices()
  }

  loadingDevices() {
    const subscription = this.manager.onStateChange((state) => {
      if (state === 'PoweredOn') {
        this.scanDevices()
        subscription.remove()
      }
    }, true)
  }

  scanDevices() {
    const devices = new Set()

    this.manager.startDeviceScan(
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
          this.manager.stopDeviceScan()
        }
      }
    )
  }

  selectDevice(selectedDevice: Device) {
    selectedDevice.connect()
      .then((device: Device) => {
        console.log('Connection available with: ', device.name)
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
          console.log('Monitor fail:', JSON.stringify(error))
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
    this.circleRadius.addListener((circleRadius) => {
      this.circleRef?.setNativeProps({ r: circleRadius.value.toString() })
    })

    setInterval(() => {
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
    }, 1500)
  }

  setModalVisible(visible: boolean) {
    this.setState({ modalVisible: visible })
  }

  componentWillUnmount() {
    this.manager.cancelDeviceConnection(this.state.deviceId)
      .then((device: Device) => {
        console.log(`Device ${device.name} desconnected`)
      })
      .catch((error) => {
        console.log(error)
      })
      .finally(() => {
        this.manager.destroy()
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
        <View style={styles.animationSvg}>
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
        <View style={styles.btn}>
          <TouchableOpacity
            style={styles.btnOpen}
            onPress={() => this.openModal()}
          >
            <View style={styles.iconBluetooth}>
              <IconBluetoothSvg />
            </View>
            <Text style={styles.textBtnOpen}>Choose the Device</Text>
          </TouchableOpacity>
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
  animationSvg: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  btn: {
    paddingHorizontal: 50,
  },
  btnOpen: {
    width: '100%',
    height: 56,
    backgroundColor: '#493dbb',
    borderRadius: 8,
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
  iconBluetooth: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderColor: '#49439b',
  },
})
