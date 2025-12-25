// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/CheckinFeeSplitter.sol";

contract DeployCheckinFeeSplitter is Script {
    function run() external {
        // Fee recipients
        address recipient1 = 0x09D02D25D0D082f7F2E04b4838cEfe271b2daB09;
        address recipient2 = 0x19244ADED6d47fFE4bdA4D17125A3017CEB0eFBC;
        
        // Total fee: 0.00004 ETH = 40000000000000 wei
        uint256 checkinFee = 40000000000000;
        
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        CheckinFeeSplitter splitter = new CheckinFeeSplitter(
            recipient1,
            recipient2,
            checkinFee
        );
        
        console.log("CheckinFeeSplitter deployed at:", address(splitter));
        console.log("Recipient 1:", recipient1);
        console.log("Recipient 2:", recipient2);
        console.log("Checkin Fee:", checkinFee, "wei");
        
        vm.stopBroadcast();
    }
}
