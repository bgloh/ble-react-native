import React, {Component} from 'react';
import { StyleSheet, Text, View, Platform, Button } from 'react-native';
import { BleManager } from "react-native-ble-plx"
// ...
const manager = new BleManager()

export default class  App extends Component {
  constructor() {
    super()
    this.manager = new BleManager()
    this.state = {info: "", values: {}, devices : [], deleteDevices : [], count : 0}
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
      if (!devices.map(d=>d.id).includes(device.id) && device.name != null)
      {
        console.log('new device:' + device.name);
        this.setState({devices : devices.concat(device)});
      }
         
    }
    else{
          console.log('first scanned device: '+ device.name);
          this.setState({devices : devices.concat(device)});
    }
  }

  stopScan = ()=>{
    this.manager.stopDeviceScan();
    this.info('Stop scanning ....');
  }




  componentWillMount() {
    if (Platform.OS === 'ios') {
      this.manager.onStateChange((state) => {
        if (state === 'PoweredOn') this.scanAndConnect()
      })
    } else {
      //this.scanAndConnect()
     this.scan()
      // flush found list every 60 seconds
    setInterval(()=>this.setState({devices: [] }), 60000)
    }
  }

  scan() {
    this.manager.startDeviceScan(null,
                                 null, (error, device) => {
      this.info("Scanning... from scan method")
      //console.log(device)

      if (error) {
        this.error(error.message)
        return
      }

      this.storeDevices(this.state.devices,device);

      //setTimeout(this.manager.stopDeviceScan(), 30000);


    });
  }

  scanAndConnect() {
    this.manager.startDeviceScan(null,
                                 null, (error, device) => {
      this.info("Scanning...")
      //console.log(device)

      if (error) {
        this.error(error.message)
        return
      }

      this.storeDevices(this.state.devices,device);

      if (device.name === 'TI BLE Sensor Tag' || device.name === 'SensorTag') {
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
      } 
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
    <View style={styles.container}>

    <View style={styles.info}>
      <Text>{this.state.info}</Text>
    </View>  

    <View style={styles.dataList}>
    {Object.keys(this.sensors).map((key) => {
      return <Text key={key}>
               {this.sensors[key] + ": " + (this.state.values[this.notifyUUID(key)] || "-")}
             </Text>
    })}
    </View>
    
    <View style={styles.deviceList}>
      {this.state.devices.map(device => {
        return <Text key={device.id.toString()}>
                {device.name + ": " + device.id}
            </Text>
        })}
    </View>

    <View style={styles.buttonGroup}>
      <View>
          <Button title="SCAN and connect" onPress={()=>this.scanAndConnect()} ></Button>
      </View>
      <View>
          <Button title="Stop scan" onPress={()=>this.stopScan()} ></Button>
      </View>
    </View>
    


  </View>
  );
}
  
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  //  alignItems: 'center',
  //  justifyContent: 'center',
  },
  buttonGroup :{
    flex : 1,
    flexDirection: 'column',
    justifyContent: 'space-around',
    backgroundColor : 'gray',
    margin : 10,
    padding : 10
  },
  deviceList : {
    flex : 2,
    backgroundColor : 'yellow',
  },
  dataList : {
    flex :2,
    backgroundColor: "blue"
  },
  info :{
    flex: 1,
    backgroundColor: 'red',
    margin : 10,
    padding : 5,
  }
});