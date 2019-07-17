import React, {Component} from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import { BleManager } from "react-native-ble-plx"
// ...
const manager = new BleManager()

export default class  App extends Component {
  constructor() {
    super()
    this.manager = new BleManager()
    this.state = {info: "", values: {}, devices : [], deleteDevices : []}
    this.prefixUUID = "f000aa"
    this.suffixUUID = "-0451-4000-b000-000000000000"
    this.sensors = {
      0: "Temperature",
      1: "Accelerometer",
      2: "Humidity",
      3: "Magnetometer",
      4: "Barometer",
      5: "Gyroscope"
    }
  }

  serviceUUID(num) {
    return this.prefixUUID + num + "0" + this.suffixUUID
  }

  notifyUUID(num) {
    return this.prefixUUID + num + "1" + this.suffixUUID
  }

  writeUUID(num) {
    return this.prefixUUID + num + "2" + this.suffixUUID
  }

  info(message) {
    this.setState({info: message})
  }

  error(message) {
    this.setState({info: "ERROR: " + message})
  }

  updateValue(key, value) {
    this.setState({values: {...this.state.values, [key]: value}})
  }

  // store devices
  storeDevices = (devices,device) => {
      if (devices.length != 0){
        if (!devices.map(d=>d.id).includes(device.id))
        {
          console.log('new device:' + device.name);
          this.setState({devices : devices.concat(device)});
        }
        else
        {
          ;
        }
           
      }
      else{
            console.log('first scanned device: '+ device.name);
            this.setState({devices : devices.concat(device)});
      }
  }
  // refresh devices
  refreshDevices = (devices,device) => {
    ;
  }


  componentWillMount() {
    if (Platform.OS === 'ios') {
      this.manager.onStateChange((state) => {
        if (state === 'PoweredOn') this.scanAndConnect()
      })
    } else {
      this.scanAndConnect()
    }
  }

  scanAndConnect() {
    this.manager.startDeviceScan(null,
                                 null, (error, device) => {
      this.info("Scanning...")
     // console.log(device)

      if (error) {
        this.error(error.message)
        return
      }

      this.storeDevices(this.state.devices, device);
      this.refreshDevices(this.state.devices, device);

    /*  if (device.name === 'TI BLE Sensor Tag' || device.name === 'SensorTag') {
        this.info("Connecting to TI Sensor")
        this.manager.stopDeviceScan()
        device.connect()
          .then((device) => {
            this.info("Discovering services and characteristics")
            return device.discoverAllServicesAndCharacteristics()
          })
          .then((device) => {
            this.info("Setting notifications")
            return this.setupNotifications(device)
          })
          .then(() => {
            this.info("Listening...")
          }, (error) => {
            this.error(error.message)
          })
      } */
    });
  }

  async setupNotifications(device) {
    for (const id in this.sensors) {
      const service = this.serviceUUID(id)
      const characteristicW = this.writeUUID(id)
      const characteristicN = this.notifyUUID(id)

      const characteristic = await device.writeCharacteristicWithResponseForService(
        service, characteristicW, "AQ==" /* 0x01 in hex */
      )

      device.monitorCharacteristicForService(service, characteristicN, (error, characteristic) => {
        if (error) {
          this.error(error.message)
          return
        }
        this.updateValue(characteristic.uuid, characteristic.value)
      })
    }
  }

render(){
  return (
    <View>
    <Text>{this.state.info}</Text>
    {Object.keys(this.sensors).map((key) => {
      return <Text key={key}>
               {this.sensors[key] + ": " + (this.state.values[this.notifyUUID(key)] || "-")}
             </Text>
    })}


  <View>
    {this.state.devices.map(device => {
      return <Text key={device.id.toString()}>
                {device.name + ": " + device.id}
            </Text>
    })}
  </View>

  <View>
    <Text>Delete List</Text>
    {this.state.deleteDevices.map(device => {
      return <Text key={device.id.toString()}>
                {device.name + ": " + device.id}
            </Text>
    })}
  </View>

  </View>  
  
  
  );
}
  
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
